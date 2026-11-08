import { L, type Archetype, type EventTemplate, type OutcomeTemplate } from '../data/archetypes/archetypeTypes'

/**
 * Structural template used when the hypothesis matches no curated archetype.
 * It is deliberately explicit about being a rule-driven skeleton: it never
 * invents historical facts, only the shape of a simulation.
 */
export function createGenericArchetype(hypothesis: string, year: number): Archetype {
  const subject = hypothesis
    .replace(/^(如果|假如|假设|what if|if)\s*/i, '')
    .replace(/[?？。.!！]+$/g, '')
    .trim()
  const shortSubject = subject.length > 42 ? `${subject.slice(0, 42)}…` : subject

  const event = (
    dy: number,
    title: L,
    desc: L,
    cause: L,
    category: EventTemplate['category'],
    nature: EventTemplate['nature'],
    confidence: EventTemplate['confidence'],
    parentIndex?: number,
  ): EventTemplate => ({
    dy,
    title,
    desc,
    category,
    cause,
    immediate: [
      L('直接受影响的群体开始调整行为。', 'Directly affected groups begin to adjust their behaviour.'),
      L('既有制度出现适应压力。', 'Existing institutions come under adaptive pressure.'),
    ],
    longTerm: [
      L('产业结构与制度安排逐步重塑。', 'Industrial structure and institutions are gradually reshaped.'),
      L('出现与现实中不同的技术或社会路径。', 'A technical or social path emerges that differs from reality.'),
    ],
    affected: [L('相关行业', 'Related industries'), L('公共部门', 'Public sector')],
    confidence,
    nature,
    parentIndex,
  })

  return {
    id: 'generic',
    keywords: [],
    canonicalYear: year,
    title: L(`如果${shortSubject}`, `What if ${shortSubject}`),
    assumptions: [
      L(
        `以「${shortSubject}」作为唯一的分歧条件，其余条件按现实世界的规律继续演化。`,
        `「${shortSubject}」is the only changed condition; everything else evolves by real-world rules.`,
      ),
      L(
        '替代方案、独立发明与制度调整都被视为可能，不假定相关领域整体消失。',
        'Substitutes, independent invention and institutional adaptation are all treated as possible; the field is not assumed to vanish.',
      ),
      L(
        '本结果是规则驱动的结构性推演骨架，不是领域专家的实证分析。',
        'This is a rule-driven structural skeleton, not an evidence-based domain analysis.',
      ),
    ],
    divergence: L(
      `分歧点是「${shortSubject}」这一条件被移除或被改变，导致原有的因果链出现缺口，需要由替代机制填补。`,
      `The divergence is that the condition 「${shortSubject}」is removed or changed, leaving a gap in the causal chain that substitute mechanisms must fill.`,
    ),
    uncertainties: [
      L('替代方案的出现时间与主导者无法确定。', 'When and by whom a substitute appears cannot be determined.'),
      L('制度与政策的反应速度会显著改变结果。', 'The speed of institutional response would significantly change the result.'),
      L('本推演未使用领域专属数据模型，结论仅用于结构化的思想实验。', 'No domain-specific data model is used; conclusions serve a structured thought experiment only.'),
    ],
    keyDifferences: [
      L('现实世界：该条件存在，相关路径按已发生的方向发展。', 'Real world: the condition exists and the path follows what happened.'),
      L(`平行世界：缺少「${shortSubject}」，替代机制需要更长时间成熟。`, `Parallel world: without 「${shortSubject}」, substitutes take longer to mature.`),
    ],
    changedAreas: [
      L('技术与产业路径', 'Technology and industry paths'),
      L('制度与监管', 'Institutions and regulation'),
      L('社会与文化预期', 'Social and cultural expectations'),
    ],
    baseline: [],
    main: [
      event(
        0,
        L('初始条件改变', 'Initial conditions change'),
        L(`分歧条件生效：世界不再拥有「${shortSubject}」这一前提。`, `The divergence takes effect: the world no longer has 「${shortSubject}」as a premise.`),
        L('假设本身即为起点。', 'The hypothesis itself is the starting point.'),
        'society',
        'INFERENCE',
        'medium',
      ),
      event(
        1,
        L('直接替代方案出现', 'Immediate substitutes appear'),
        L('既有技术或制度被重新组合，用于填补失效的功能。', 'Existing technology or institutions are recombined to fill the lost function.'),
        L('功能需求不会消失，只会寻找替代路径。', 'The functional need does not disappear; it seeks substitute paths.'),
        'technology',
        'INFERENCE',
        'medium',
        0,
      ),
      event(
        2,
        L('成本结构改变', 'Cost structure changes'),
        L('替代方案的效率低于原方案，相关成本在短期上升。', 'Substitutes are less efficient, so related costs rise in the short term.'),
        L('替代技术成熟度不足。', 'Substitute maturity is insufficient.'),
        'economy',
        'INFERENCE',
        'medium',
        1,
      ),
      event(
        4,
        L('制度开始调整', 'Institutions begin to adapt'),
        L('监管、标准与教育体系围绕新的技术现实重新设计。', 'Regulation, standards and education are redesigned around the new technological reality.'),
        L('既有的规则不再适用。', 'Existing rules no longer apply.'),
        'politics',
        'INFERENCE',
        'medium',
        2,
      ),
      event(
        6,
        L('社会预期重设', 'Social expectations reset'),
        L('公众对效率、隐私与风险的默认预期被重新校准。', 'Public defaults about efficiency, privacy and risk are recalibrated.'),
        L('长期生活经验发生变化。', 'Lived experience changes over time.'),
        'culture',
        'INFERENCE',
        'low',
        3,
      ),
      event(
        8,
        L('新的均衡形成', 'A new equilibrium forms'),
        L('替代路径稳定下来，形成与现实不同但自洽的结构。', 'The substitute path stabilises into a structure that is different from reality yet coherent.'),
        L('替代方案达到可用成熟度。', 'Substitutes reach usable maturity.'),
        'society',
        'INFERENCE',
        'low',
        3,
      ),
    ],
    extra: [
      event(
        11,
        L('制度化的惯性', 'Institutional inertia sets in'),
        L('新路径被写入标准与法规，逆转成本上升。', 'The new path is written into standards and law, raising reversal costs.'),
        L('制度自我强化。', 'Institutions reinforce themselves.'),
        'politics',
        'INFERENCE',
        'low',
        5,
      ),
    ],
    branches: [
      {
        key: 'fast-substitute',
        name: L('分支 A：替代方案快速成熟', 'Branch A: Substitutes mature quickly'),
        condition: L('假设替代技术在十年内达到可用水平。', 'Suppose substitutes reach usability within a decade.'),
        summary: L('冲击被压缩在较短时期，长期损失较小。', 'The shock compresses into a shorter period with smaller long-run losses.'),
        color: '#38bdf8',
        outcomes: [L('快速收敛的替代路径', 'A rapidly converging substitute path')],
        events: [
          event(
            3,
            L('替代技术突破', 'Substitute breakthrough'),
            L('关键工程瓶颈被解决，替代方案成本快速下降。', 'A key engineering bottleneck is solved and substitute costs fall quickly.'),
            L('研发投入集中。', 'Concentrated R&D investment.'),
            'technology',
            'INFERENCE',
            'low',
          ),
        ],
      },
      {
        key: 'stagnation',
        name: L('分支 B：长期停滞', 'Branch B: Prolonged stagnation'),
        condition: L('假设替代方案长期无法达到原有效率。', 'Suppose substitutes never reach the original efficiency.'),
        summary: L('效率损失长期化，产业格局更保守。', 'Efficiency losses persist and the industry becomes more conservative.'),
        color: '#a78bfa',
        outcomes: [L('低效率的稳定状态', 'A low-efficiency steady state')],
        events: [
          event(
            5,
            L('效率差距固化', 'The efficiency gap hardens'),
            L('既有组织围绕低效率方案重组，既得利益阻止进一步变革。', 'Organisations reorganise around the inferior option and incumbents block further change.'),
            L('转换成本过高。', 'Switching costs are too high.'),
            'economy',
            'INFERENCE',
            'low',
          ),
        ],
      },
      {
        key: 'third-path',
        name: L('分支 C：第三条路径', 'Branch C: A third path'),
        condition: L('假设出现了既非原方案也非直接替代的新范式。', 'Suppose a new paradigm appears that is neither the original nor a direct substitute.'),
        summary: L('世界走向一个现实中不存在的结构。', 'The world moves toward a structure that does not exist in reality.'),
        color: '#f59e0b',
        outcomes: [L('全新范式', 'A new paradigm')],
        events: [
          event(
            7,
            L('新范式出现', 'A new paradigm emerges'),
            L('跨领域组合产生新的解决方案，绕开了原有约束。', 'Cross-domain combination produces a solution that bypasses the original constraint.'),
            L('知识迁移。', 'Knowledge transfer.'),
            'science',
            'FICTION',
            'low',
          ),
        ],
      },
    ],
    outcomes: [
      {
        title: L('结局 A：快速替代', 'Outcome A: Rapid substitution'),
        branchKey: 'fast-substitute',
        path: [L('条件改变', 'Condition changes'), L('替代突破', 'Substitute breakthrough'), L('新均衡', 'New equilibrium')],
        keyConditions: [L('研发投入足够', 'Sufficient R&D investment')],
        mainImpacts: [L('短期成本上升后回落', 'Costs rise then fall')],
        uncertainty: 'medium',
        uncertaintyReason: L('技术成熟时间不确定。', 'Maturation timing is uncertain.'),
        differsFrom: [L('与停滞结局相比恢复更快', 'Recovers faster than stagnation')],
      } satisfies OutcomeTemplate,
      {
        title: L('结局 B：长期低效率', 'Outcome B: Long-run inefficiency'),
        branchKey: 'stagnation',
        path: [L('条件改变', 'Condition changes'), L('替代不足', 'Weak substitutes'), L('效率固化', 'Efficiency locks in')],
        keyConditions: [L('替代技术始终不成熟', 'Substitutes never mature')],
        mainImpacts: [L('增长路径更低', 'A lower growth path')],
        uncertainty: 'medium',
        uncertaintyReason: L('替代潜力难以评估。', 'Substitute potential is hard to assess.'),
        differsFrom: [L('与快速替代相比损失更大', 'Larger losses than rapid substitution')],
      },
      {
        title: L('结局 C：新范式出现', 'Outcome C: A new paradigm'),
        branchKey: 'third-path',
        path: [L('条件改变', 'Condition changes'), L('跨域组合', 'Cross-domain mix'), L('新范式', 'New paradigm')],
        keyConditions: [L('跨领域知识流动', 'Cross-domain knowledge flow')],
        mainImpacts: [L('出现现实中不存在的结构', 'Structures emerge that do not exist in reality')],
        uncertainty: 'high',
        uncertaintyReason: L('范式创新的不可预测性。', 'Paradigm innovation is unpredictable.'),
        differsFrom: [L('与另外两个结局相比结构完全不同', 'Structurally unlike the other outcomes')],
      },
    ],
    metrics: [
      { name: L('替代方案成熟度', 'Substitute maturity'), domain: 'technology', direction: 'unknown', note: L('取决于研发投入与工程瓶颈。', 'Depends on R&D and engineering bottlenecks.'), confidence: 'low' },
      { name: L('短期转换成本', 'Short-run switching cost'), domain: 'economy', direction: 'up', note: L('替代方案效率低于原方案。', 'Substitutes are less efficient.'), confidence: 'medium' },
      { name: L('制度适应速度', 'Institutional adaptation speed'), domain: 'politics', direction: 'unknown', note: L('政策反应速度差异很大。', 'Policy response varies widely.'), confidence: 'low' },
      { name: L('社会预期稳定性', 'Stability of social expectations'), domain: 'society', direction: 'down', note: L('长期生活经验被打破。', 'Lived experience is disrupted.'), confidence: 'low' },
    ],
  }
}
