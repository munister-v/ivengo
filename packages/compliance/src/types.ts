export type Severity = 'low' | 'medium' | 'high'

export interface ComplianceFlag {
  rule: string
  severity: Severity
  match: string
  description: string
}

export interface ComplianceResult {
  passed: boolean
  flags: ComplianceFlag[]
}
