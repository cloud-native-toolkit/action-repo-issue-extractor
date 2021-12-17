import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/action'
import {IssueExtractor, IssueInfo} from './services/issue-extractor'

async function run(): Promise<void> {
  try {
    const token: string = core.getInput('token')
    const issue_number: number = parseInt(core.getInput('issue_number'))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit: Octokit = github.getOctokit(token) as any
    const {owner, repo} = github.context.repo

    core.info(`Extracting info from ${owner}/${repo}#${issue_number}`)

    const service: IssueExtractor = new IssueExtractor()

    const result: IssueInfo = await service.extractInfo({
      octokit,
      issue_number,
      owner,
      repo
    })

    core.info(`Extracted values: ${JSON.stringify(result)}`)

    // eslint-disable-next-line github/array-foreach
    Object.keys(result).forEach((value: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key: keyof IssueInfo = value as any

      core.setOutput(key, result[key] || '')
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run().catch(error => core.error(`Error running script: ${error.message}`))
