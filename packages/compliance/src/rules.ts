import type { ComplianceFlag, Severity } from './types'

interface Rule {
  id: string
  description: string
  severity: Severity
  patterns: RegExp[]
}

const RULES: Rule[] = [
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
      /стабільн\w* дохід від/gi,
      /заробляй на казино/gi,
      /заробіток в казино/gi,
      /стабильн\w* доход от казино/gi,
      /зарабатывай в казино/gi,
    ],
  },
  {
    id: 'minors_targeting',
    description: 'Контент спрямований на неповнолітніх',
    severity: 'high',
    patterns: [
      /для дітей/gi,
      /дитяч\w+ казино/gi,
      /для несовершеннолетних/gi,
      /детск\w+ казино/gi,
    ],
  },
  {
    id: 'aggressive_bonus',
    description: 'Агресивна реклама бонусів без умов',
    severity: 'medium',
    patterns: [
      /безлімітн\w* бонус/gi,
      /бонус без умов/gi,
      /безлимитн\w* бонус/gi,
      /бонус без условий/gi,
    ],
  },
  {
    id: 'withdrawal_guarantee',
    description: 'Гарантія легкого виведення коштів',
    severity: 'medium',
    patterns: [
      /гарантован\w* вивід/gi,
      /миттєвий вивід без/gi,
      /гарантированн\w* вывод/gi,
      /мгновенный вывод без/gi,
    ],
  },
  {
    id: 'pressure_tactics',
    description: 'Тактики тиску та терміновості',
    severity: 'medium',
    patterns: [
      /тільки сьогодні!/gi,
      /залишилось \d+ місць/gi,
      /не пропусти!/gi,
      /только сегодня!/gi,
      /не пропусти!/gi,
    ],
  },
  {
    id: 'missing_disclaimer',
    description: 'Відсутній дисклеймер про ризики',
    severity: 'low',
    patterns: [],
    // Checked separately via hasDisclaimer()
  },
]

export function runComplianceRules(content: string): ComplianceFlag[] {
  const flags: ComplianceFlag[] = []

  for (const rule of RULES) {
    if (rule.patterns.length === 0) continue
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
  const disclaimerPatterns = [
    /відповідальна гра/gi,
    /грай відповідально/gi,
    /18\+/g,
    /тільки для повнолітніх/gi,
    /ответственная игра/gi,
    /играй ответственно/gi,
  ]
  return disclaimerPatterns.some((p) => p.test(content))
}
