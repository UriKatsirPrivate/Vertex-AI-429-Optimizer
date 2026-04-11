export const parseArtifacts = (text: string) => {
  const promptRegex = /## 1\. Optimized Prompt[^\n]*\n([\s\S]*?)(?=## 2\. Optimized Code|## 3\. 429 Error Reduction Report|## 4\. requirements\.txt|## 5\. Skill Files|$)/i;
  const codeRegex = /## 2\. Optimized Code[^\n]*\n([\s\S]*?)(?=## 3\. 429 Error Reduction Report|## 4\. requirements\.txt|## 5\. Skill Files|$)/i;
  const reportRegex = /## 3\. 429 Error Reduction Report[^\n]*\n([\s\S]*?)(?=## 4\. requirements\.txt|## 5\. Skill Files|$)/i;
  const requirementsRegex = /## 4\. requirements\.txt[^\n]*\n([\s\S]*?)(?=## 5\. Skill Files|$)/i;
  const skillRegex = /## 5\. Skill Files[^\n]*\n([\s\S]*?)$/i;

  const promptMatch = text.match(promptRegex);
  const codeMatch = text.match(codeRegex);
  const reportMatch = text.match(reportRegex);
  const requirementsMatch = text.match(requirementsRegex);
  const skillMatch = text.match(skillRegex);

  const firstHeadingIndex = text.search(/## 1\. Optimized Prompt|## 2\. Optimized Code|## 3\. 429 Error Reduction Report|## 4\. requirements\.txt|## 5\. Skill Files/i);
  const conversational = firstHeadingIndex !== -1 ? text.substring(0, firstHeadingIndex).trim() : text.trim();

  return {
    conversational,
    prompt: promptMatch ? promptMatch[1].trim() : '',
    code: codeMatch ? codeMatch[1].trim() : '',
    report: reportMatch ? reportMatch[1].trim() : '',
    requirements: requirementsMatch ? requirementsMatch[1].trim() : '',
    skill: skillMatch ? skillMatch[1].trim() : ''
  };
};
