#!/usr/bin/env node

const verifyLinks = require('./')
const sh = require('@quarterto/sh')
const tmp = require('tmp-promise')

const clone = sh`
git clone "${({ repo }) => repo}" "${({ folder }) => folder}"
`

const diff = sh`
git diff --stat
`

const commit = sh`
git commit -am "${({ message }) => message}"
`

const push = sh`
git push
`

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
	await clone({ repo, folder })

	const originalCwd = process.cwd()
	process.chdir(folder)

	await verifyLinks({ base, folder })

	process.chdir(originalCwd)
	await diff()
	await commit({ message: 'fixed broken links' })

	await tempFolder.cleanup()
}

main()
