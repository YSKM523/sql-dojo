export type AiAction = 'hint' | 'explain' | 'debug';

export interface AiPayload {
  title?: string;
  prompt?: string;
  sql: string;
  errorMsg?: string;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function buildMessages(action: AiAction, p: AiPayload): ChatMessage[] {
  if (action === 'hint') {
    return [
      {
        role: 'system',
        content:
          '你是一位 SQL 教练。请给出循序渐进的提示：指出下一步该想什么、或哪里可能不对。' +
          '绝对不要直接给出完整答案或可直接提交的完整 SQL。用中文，2-4 句，简洁。',
      },
      {
        role: 'user',
        content: `题目：${p.title ?? ''}\n要求：${p.prompt ?? ''}\n我目前写的 SQL：\n${p.sql || '(还没写)'}`,
      },
    ];
  }
  if (action === 'explain') {
    return [
      {
        role: 'system',
        content: '你是 SQL 老师。用中文逐步、通俗地解释给初学者这条 SQL 在做什么。简洁，不超过 6 句。',
      },
      { role: 'user', content: `解释这条 SQL：\n${p.sql}` },
    ];
  }
  return [
    {
      role: 'system',
      content:
        '你是 SQL 调试助手。学员的 SQL 报错了，用中文解释报错原因并给出修复方向。' +
        '可以给出关键片段，但不要直接写出整道题的完整答案。简洁。',
    },
    { role: 'user', content: `SQL：\n${p.sql}\n\n报错信息：\n${p.errorMsg ?? '(无)'}` },
  ];
}
