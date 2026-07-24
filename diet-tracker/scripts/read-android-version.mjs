import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const buildFile = readFileSync(resolve('android/app/build.gradle'), 'utf8')
const versionCode = buildFile.match(/^\s*versionCode\s+(\d+)\s*$/m)?.[1]
const versionName = buildFile.match(/^\s*versionName\s+"([^"]+)"\s*$/m)?.[1]

if (!versionCode || !versionName || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(versionName)) {
  throw new Error('Unable to read a valid versionCode and versionName from android/app/build.gradle')
}

const output = `version_code=${versionCode}\nversion_name=${versionName}\n`
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
else process.stdout.write(output)
