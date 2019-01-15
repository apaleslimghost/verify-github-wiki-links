#!/usr/bin/env node

const verifyLinks = require('./')
const tmp = require('tmp-promise')
const exec = require('util').promisify(require('child_process').exec)
const inquirer = require('inquirer')

const confirm = async message =>
	(await inquirer.prompt({ name: 'yea', message, type: confirm })).yea

const clone = ({ repo, folder }) => exec(`git clone "${repo}" "${folder}"`)
const diff = ({ folder }) => exec(`git diff --stat`, { cwd: folder })
const commit = ({ message, folder }) =>
	exec(`git commit -am "${message}"`, { cwd: folder })
const push = ({ folder }) => exec(`git push`, { cwd: folder })

const logStdout = ({ stdout }) => console.log(stdout)

async function main() {
	const repoPath = process.argv[2]
	if (!repoPath) {
		console.log('call this with the path of the repository')
		return (process.exitCode = 1)
	}

	const repo = `git@github.com:${repoPath}.wiki.git`
	const base = `https://github.com/${repoPath}/wiki`
	const tempFolder = await tmp.dir({ unsafeCleanup: true })
	const folder = tempFolder.path

	console.log('cloning...')
	await clone({ repo, folder })

	const originalCwd = process.cwd()
	process.chdir(folder)

	await verifyLinks({ base, folder })
	logStdout(await diff({ folder }))

	if (await confirm('commit & push this?')) {
		logStdout(
			await commit({
				message: 'fixed broken links & standardised formatting',
				folder
			})
		)

		await push({ folder })
	}

	process.chdir(originalCwd)
	await tempFolder.cleanup()
}

main()
