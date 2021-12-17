import {Octokit} from '@octokit/action'

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
}

interface GithubIssue {
  title: string
}
interface GithubLabel {
  name: string
}

export class IssueExtractor {
  async extractInfo({
    octokit,
    issue_number,
    owner,
    repo
  }: ExtractInfoParams): Promise<IssueInfo> {
    const issue: GithubIssue = await octokit
      .request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner,
        repo,
        issue_number
      })
      .then(response => response.data)

    const name = extractName(issue)

    const labels: GithubLabel[] = await octokit
      .request('GET /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner,
        repo,
        issue_number
      })
      .then(response => response.data)

    const type = extractType(labels)
    const provider = extractProvider(labels)
    const category = extractCategory(labels)

    const approved = isApproved(labels)

    return {
      name,
      type,
      provider,
      category,
      approved
    }
  }
}

const extractName = (issue: GithubIssue): string => {
  if (issue.title.split(':').length > 1) {
    return issue.title.split(':')[1]
  }

  return issue.title
}

const extractType = (labels: GithubLabel[]): string | undefined => {
  return extractValueFromLabel(labels, 'type')
}

const extractProvider = (labels: GithubLabel[]): string | undefined => {
  return extractValueFromLabel(labels, 'platform')
}

const extractCategory = (labels: GithubLabel[]): string | undefined => {
  return extractValueFromLabel(labels, 'category')
}

const isApproved = (labels: GithubLabel[]): boolean => {
  return hasLabel(labels, 'approved')
}

const extractValueFromLabel = (
  labels: GithubLabel[],
  key: string
): string | undefined => {
  const result: string[] = labels
    .map(label => label.name)
    .filter((name: string) => name.startsWith(`${key}:`))
    .map(name => name.split(':')[1].trim())

  if (result.length === 0) {
    return
  }

  return result[0]
}

const hasLabel = (labels: GithubLabel[], label: string): boolean => {
  const result: string[] = labels
    .map(l => l.name)
    .filter(name => name === label)

  return result.length > 0
}
