import type { ComplianceFlag, Severity } from './types'

interface Rule {
  id: string
  description: string
  severity: Severity
  patterns: RegExp[]
  // Types that are exempt from this rule
  exemptTypes?: string[]
}

const RULES: Rule[] = [
  // ── HIGH SEVERITY (blocking) ──────────────────────────────────
  {
    id: 'guaranteed_win',
    description: 'Гарантований виграш — заборонено законодавством',
    severity: 'high',
    patterns: [
      /гарантован\w* виграш/gi,
      /гарантован\w* прибуток/gi,
      /100% виграш/gi,
      /завжди виграєш/gi,
      /гарантированн\w* выигрыш/gi,
      /100% победа/gi,
      /guaranteed\s+win/gi,
    ],
  },
  {
    id: 'false_profit_claim',
    description: 'Хибні твердження про стабільний дохід від гри',
    severity: 'high',
    patterns: [
      /стабільн\w* дохід від казино/gi,
      /заробляй на казино без/gi,
      /стабильн\w* доход от казино/gi,
      /заработок в казино гарантирован/gi,
    ],
  },
  {
    id: 'minors_targeting',
    description: 'Контент спрямований на неповнолітніх',
    severity: 'high',
    patterns: [
      /для дітей до 18/gi,
      /дитяч\w+ казино/gi,
      /для несовершеннолетних/gi,
      /детск\w+ казино/gi,
    ],
  },

  // ── MEDIUM SEVERITY (warning, non-blocking) ───────────────────
  {
    id: 'aggressive_bonus_no_terms',
    description: 'Бонус без жодних умов — рекомендується додати *умови*',
    severity: 'medium',
    patterns: [
      /бонус без будь-яких умов/gi,
      /бонус без умов і обмежень/gi,
      /бонус без условий и ограничений/gi,
    ],
  },

  // ── LOW SEVERITY (informational, non-blocking) ────────────────
  {
    id: 'pressure_tactics',
    description: 'Тактики терміновості — допустимо, але помірно',
    severity: 'low',
    patterns: [
      /тільки сьогодні!/gi,
      /залишилось \d+ місць/gi,
      /разбирают быстро/gi,
      /годинник цікає/gi,
      /час витікає/gi,
      /только сегодня!/gi,
    ],
    // urgency_offer and user_story posts are expected to have this
    exemptTypes: ['urgency_offer', 'user_story'],
  },
  {
    id: 'missing_disclaimer',
    description: 'Рекомендується додати 18+ або дисклеймер',
    severity: 'low',
    patterns: [],
    exemptTypes: ['responsible_gambling', 'engagement_poll'],
  },
]

export function runComplianceRules(content: string, contentType?: string): ComplianceFlag[] {
  const flags: ComplianceFlag[] = []

  for (const rule of RULES) {
    if (rule.patterns.length === 0) continue
    if (rule.exemptTypes?.includes(contentType ?? '')) continue

    for (const pattern of rule.patterns) {
      const match = content.match(pattern)
      if (match) {
        flags.push({
          rule: rule.id,
          severity: rule.severity,
          match: match[0],
          description: rule.description,
        })
        break
      }
    }
  }

  return flags
}

export function hasResponsibleGamblingDisclaimer(content: string): boolean {
  return /18\+|тільки для повнолітніх|відповідальна гра|ответственная игра|тільки 18\+/i.test(content)
}
