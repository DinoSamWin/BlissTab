import { PerspectiveHistory } from '../../types';

const PRODUCTIVITY_PLANNING_PATTERNS = [
  /(?:优先级|优先|效率|进度|待办|任务清单)/u,
  /(?:工作|任务|事情|手里的事).{0,12}(?:排|挤|塞|优先|推进|处理|完成|做完|开工)/u,
  /(?:先|只|一次).{0,4}(?:做|处理|推进|留).{0,5}(?:一件|一项|最重要|最清楚|前面)/u,
  /(?:一件|一项).{0,8}(?:留在前面|排在前面|先完成|先处理)/u,
  /(?:安排|计划).{0,8}(?:工作|任务|事情|今天)/u,
  /(?:priority|prioritize|productivity|progress|to-do|task list)/iu,
  /(?:work|tasks?|things?).{0,18}(?:queue|crowd|pack|prioritize|finish|complete|schedule)/iu,
  /(?:do|handle|finish|pick).{0,10}(?:one|the most important|the clearest).{0,8}(?:task|thing)/iu,
];

/** Identifies task-ordering and efficiency advice, not every mention of work. */
export function isProductivityPlanningText(text: string): boolean {
  return PRODUCTIVITY_PLANNING_PATTERNS.some(pattern => pattern.test(text));
}

export function countRecentProductivityLines(
  history: PerspectiveHistory[],
  lookback: number = 8
): number {
  return history.slice(0, lookback).filter(item => isProductivityPlanningText(item.text)).length;
}
