const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function rankMistakes(mistakes) {
  return [...mistakes].sort((first, second) =>
    (severityRank[first.severity] ?? 4) - (severityRank[second.severity] ?? 4)
    || second.frequency - first.frequency
    || new Date(second.lastOccurred).getTime() - new Date(first.lastOccurred).getTime()
  );
}