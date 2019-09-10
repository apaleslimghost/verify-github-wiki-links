const remark = require('remark')
const fs = require('mz/fs')
const path = require('path')
const leven = require('leven')
const sortBy = require('lodash.sortby')
const chalk = require('chalk')
const inquirer = require('inquirer')
const escapeStringRegexp = require('escape-string-regexp')

const visitLinksAsync = async (node, visitor) => {
	if (node.type === 'link') {
		await visitor(node)
	}

	for (const child of node.children || []) {
		await visitLinksAsync(child, visitor)
	}
}

const formatLink = link =>
	chalk.gray(`[
  ${chalk.blue.underline(link.children[0].value)}
](
  ${chalk.magenta.italic(link.url)}
)`)

const all = Symbol('all')
const manual = Symbol('manual')
const skip = Symbol('skip')

const askValidLinks = ({ base, validWikiPages }) => async node =>
	visitLinksAsync(node, async link => {
		if (
			link.url.toLowerCase() !== base.toLowerCase() &&
			link.url.toLowerCase().startsWith(base.toLowerCase())
		) {
			const fileSection = getWikiFileSection(link.url)
			const suffix = link.url.replace(
				new RegExp(`^${base}/${escapeStringRegexp(fileSection)}`, 'i'),
				''
			)

			if (
				fileSection !== 'wiki' &&
				!validWikiPages.some(
					page =>
						page === decodeURIComponent(fileSection)
				)
			) {
				const candidates = sortBy(validWikiPages, page =>
					leven(fileSection, page)
				)

				console.log('broken link found:')
				console.log(formatLink(link))

				const { replacement } = await inquirer.prompt([
					{
						name: 'replacement',
						message: 'closest matches',
						type: 'list',
						pageSize: 9,
						choices: candidates
							.slice(0, 5)
							.map(
								candidate => `${base}/${encodeURIComponent(candidate)}${suffix}`
							)
							.concat([
								new inquirer.Separator(),
								{ name: 'show all wiki pages', value: all },
								{ name: 'enter manually', value: manual },
								{ name: 'skip this link', value: skip }
							])
					},
					{
						name: 'replacement',
						type: 'list',
						when: ({ replacement }) => replacement === all,
						pageSize: 8,
						choices: validWikiPages
							.map(
								candidate => `${base}/${encodeURIComponent(candidate)}${suffix}`
							)
							.concat([
								new inquirer.Separator(),
								{ name: 'enter manually', value: manual },
								{ name: 'skip this link', value: skip }
							])
					},
					{
						name: 'replacement',
						when: ({ replacement }) => replacement === manual,
						transformer: input =>
							input.startsWith(base) ? input : `${base}/${input}`,
						filter: input => `${base}/${input}`
					}
				])

				if (replacement !== skip) {
					link.url = replacement
				}

				console.log()
			}
		}
	})

const getWikiFileSection = url =>
	path.basename(url.replace(/(\/_edit)?(#.*)?$/g, ''))

module.exports = async function main({ base, folder }) {
	const files = (await fs.readdir(folder)).filter(
		file => path.extname(file) === '.md'
	)

	const validWikiPages = files.map(file => path.basename(file, '.md'))

	const processLinks = remark()
		.use({
			settings: { gfm: true }
		})
		.use(askValidLinks, {
			base,
			validWikiPages
		})

	for (const file of files) {
		const p = path.join(folder, file)
		const content = await fs.readFile(p, 'utf8')

		console.log(chalk.cyan.bold.underline(file))
		const processed = await processLinks.process(content)
		await fs.writeFile(p, processed, 'utf8')
		console.log(chalk.green.bold('✓') + chalk.grey.italic(' okay'))
		console.log()
	}
}
