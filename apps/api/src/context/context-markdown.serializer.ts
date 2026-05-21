type ContextMarkdownInput = Partial<Record<string, string | null | undefined>>;

function text(value: string | null | undefined) {
  return value?.trim() || null;
}

function line(label: string, value: string | null | undefined) {
  const content = text(value);
  return content ? `- ${label}: ${content}` : null;
}

function section(title: string, lines: Array<string | null>, fallback: string) {
  const content = lines.filter(Boolean) as string[];
  return [`## ${title}`, '', ...(content.length ? content : [fallback]), ''].join('\n');
}

export function serializeContextMarkdown(input: ContextMarkdownInput) {
  return [
    '# Company Context',
    '',
    section(
      'Business overview',
      [
        line('Company', input.companyName),
        line('Industry', input.industry),
        line('Description', input.description),
      ],
      'No business overview has been registered yet.',
    ),
    section(
      'Positioning',
      [line('Mission', input.mission), line('Vision', input.vision), line('Value proposition', input.valueProposition)],
      'No positioning has been registered yet.',
    ),
    section(
      'Products and services',
      [line('Products', input.products), line('Pricing', input.pricing)],
      'No products or services have been registered yet.',
    ),
    section(
      'Audience and channels',
      [line('Ideal customer', input.idealCustomer), line('Pain points', input.painPoints), line('Channels', input.channels)],
      'No audience or channel guidance has been registered yet.',
    ),
    section(
      'Communication guidance',
      [line('Tone', input.tone), line('Communication style', input.communicationStyle), line('Words to avoid', input.avoidWords)],
      'No communication guidance has been registered yet.',
    ),
    section(
      'Differentials and FAQ',
      [line('Differentials', input.differentials), line('FAQ', input.faq)],
      'No differentials or FAQ have been registered yet.',
    ),
    section(
      'Operational processes and rules',
      [line('Processes', input.processes), line('Rules', input.rules), line('Tools', input.tools)],
      'No operational rules have been registered yet.',
    ),
  ].join('\n');
}
