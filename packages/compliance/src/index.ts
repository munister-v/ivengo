import { runComplianceRules, hasResponsibleGamblingDisclaimer } from './rules'
import type { ComplianceResult, ComplianceFlag } from './types'

export function checkCompliance(content: string, contentType?: string): ComplianceResult {
  const flags: ComplianceFlag[] = runComplianceRules(content)

  // Responsible gambling posts are exempt from disclaimer check
  const needsDisclaimer = contentType !== 'responsible_gambling'
  if (needsDisclaimer && !hasResponsibleGamblingDisclaimer(content)) {
    flags.push({
      rule: 'missing_disclaimer',
      severity: 'low',
      match: '',
      description: 'Рекомендується додати дисклеймер про відповідальну гру або 18+',
    })
  }

  const hasCritical = flags.some((f) => f.severity === 'high')
  const passed = !hasCritical

  return { passed, flags }
}

export type { ComplianceResult, ComplianceFlag, Severity } from './types'
