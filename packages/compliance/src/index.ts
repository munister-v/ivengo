import { runComplianceRules, hasResponsibleGamblingDisclaimer } from './rules'
import type { ComplianceResult, ComplianceFlag } from './types'

const DISCLAIMER_EXEMPT = new Set([
  'responsible_gambling',
  'engagement_poll',
  'urgency_offer',
  'user_story',
])

export function checkCompliance(content: string, contentType?: string): ComplianceResult {
  const flags: ComplianceFlag[] = runComplianceRules(content, contentType)

  if (!DISCLAIMER_EXEMPT.has(contentType ?? '') && !hasResponsibleGamblingDisclaimer(content)) {
    flags.push({
      rule: 'missing_disclaimer',
      severity: 'low',
      match: '',
      description: 'Рекомендується додати 18+ або посилання на відповідальну гру',
    })
  }

  const hasCritical = flags.some((f) => f.severity === 'high')
  const passed = !hasCritical

  return { passed, flags }
}

export type { ComplianceResult, ComplianceFlag, Severity } from './types'
