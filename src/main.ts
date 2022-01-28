import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/action'
import {IssueExtractor, IssueInfo} from './services/issue-extractor'
import {Container} from 'typescript-ioc'
import {LoggerApi} from './logger'
import {ActionLogger} from './logger/logger.action'

async function run(): Promise<void> {
  Container.bind(LoggerApi).to(ActionLogger)

  const logger: LoggerApi = Container.get(LoggerApi)
  try {
    const token: string = core.getInput('token')
    const inputIssueNumber: number = parseInt(core.getInput('issue_number'))
    const inputOwner: string = core.getInput('owner')
    const inputRepo: string = core.getInput('repo')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit: Octokit = github.getOctokit(token) as any
    const current: {owner: string; repo: string} = github.context.repo

    const owner: string = inputOwner || current.owner
    const repo: string = inputRepo || current.repo
    const issue_number: number = inputIssueNumber || github.context.issue.number

    logger.info(`Extracting info from ${owner}/${repo}#${issue_number}`)

    const service: IssueExtractor = new IssueExtractor()

    const result: IssueInfo = await service.extractInfo({
      octokit,
      issue_number,
      owner,
      repo
    })

    logger.info(`Extracted values: ${JSON.stringify(result)}`)

    // eslint-disable-next-line github/array-foreach
    Object.keys(result).forEach((value: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key: keyof IssueInfo = value as any

      if (key != "displayName" || (result[key] === undefined || result[key] === "")) {
        core.setOutput(key, result[key] || '')
      }
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run().catch(error => core.error(`Error running script: ${error.message}`))
