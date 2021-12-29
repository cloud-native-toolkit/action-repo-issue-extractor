import {Octokit} from '@octokit/action'
import {LoggerApi} from '../logger'
import {Container} from 'typescript-ioc'

export interface ExtractInfoParams {
  octokit: Octokit
  issue_number: number
  owner: string
  repo: string
}

export interface IssueInfo {
  name: string
  type?: string
  provider?: string
  category?: string
  approved: boolean
  requester: string
  state: string
  issue_number: number
}

interface GithubIssue {
  title: string
  user: {login: string}
  state: string
}
interface GithubLabel {
  name: string
}
interface GithubComment {
  body?: string
}

export class IssueExtractor {
  logger: LoggerApi

  constructor() {
    this.logger = Container.get(LoggerApi)
  }

  async extractInfo({
    octokit,
    issue_number,
    owner,
    repo
  }: ExtractInfoParams): Promise<IssueInfo> {
    this.logger.info(`Retrieving details for issue: ${issue_number}`)
    const issue: GithubIssue = (await octokit
      .request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner,
        repo,
        issue_number
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(response => response.data)) as any

    const name = extractName(issue)
    const requester = extractRequester(issue)
    const state = extractState(issue)

    this.logger.info(`Retrieving labels for issue: ${issue_number}`)
    const labels: GithubLabel[] = await octokit
      .request('GET /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner,
        repo,
        issue_number
      })
      .then(response => response.data)
    this.logger.debug(`  Labels: ${JSON.stringify(labels)}`)

    const labelValues = extractValuesFromLabel(labels)
    this.logger.info(`Extracted label values: ${JSON.stringify(labelValues)}`)

    this.logger.info(`Retrieving comments for issue: ${issue_number}`)
    const comments: GithubComment[] = await octokit
      .request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number
      })
      .then(response => response.data)
    this.logger.debug(`  Comments: ${JSON.stringify(comments)}`)

    const commentValues = extractValuesFromComments(comments)
    this.logger.info(
      `Extracted comment values: ${JSON.stringify(commentValues)}`
    )

    return Object.assign(
      {
        name,
        requester,
        state,
        issue_number
      },
      labelValues,
      commentValues
    )
  }
}

const extractName = (issue: GithubIssue): string => {
  if (issue.title.split(':').length > 1) {
    return issue.title.split(':')[1].trim()
  }

  return issue.title.trim()
}

const extractRequester = (issue: GithubIssue): string => {
  return issue.user.login
}

const extractState = (issue: GithubIssue): string => {
  return issue.state
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractValuesFromLabel = <T = any>(labels: GithubLabel[]): T => {
  const result: T = labels
    .map(l => l.name)
    .reduce((total: T, current: string) => {
      if (current.includes(':')) {
        const key: keyof T = current.split(':')[0] as keyof T
        const value = current.split(':')[1]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total[key] = value as any
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total[current as keyof T] = true as any
      }

      return total
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any)

  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractValuesFromComments = <T = any>(comments: GithubComment[]): T => {
  const valueRegEx = new RegExp('^/([^ ]+) (.*)', 'ig')

  const commentLines: string[] = comments.reduce(
    (result: string[], current: GithubComment) => {
      if (current.body) {
        result.push(
          ...current.body.split(/\r?\n/).filter(l => valueRegEx.test(l))
        )
      }

      return result
    },
    []
  )
  const logger: LoggerApi = Container.get(LoggerApi)
  logger.info(`Extracted comment lines: ${JSON.stringify(commentLines)}`)

  return commentLines.reduce(
    (result: T, current: string) => {
      const match: string[] | null = current.match(valueRegEx)

      if (match) {
        const key = match[1]
        const value = match[2]

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        result[key] = value
      }

      return result
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any
  )
}
