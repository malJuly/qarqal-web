import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AGENT_MENU } from '../agent/agent-menu';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';

// /agent — inside the agent layout. Opens the agent's first allowed page (sidebar order). Only an agent
// whose role has no portal pages yet stays here and sees a message.

@Component({
  selector: 'app-agent-home-page',
  template: `
    @if (!firstPage()) {
      <p class="ah-none">{{ i18n.t().agent.home.none }}</p>
    }`,
  styles: `
    .ah-none { padding: 14px 16px; background: #fff; border: 1px solid var(--line); border-radius: 10px; color: var(--ink-2); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentHomePage {
  protected readonly i18n = useAgentPage((t) => t.agent.meta.title);
  private readonly session = inject(AgentSession);
  protected readonly firstPage = computed(() => AGENT_MENU.find((m) => this.session.can(m.module, m.action)) ?? null);

  constructor() {
    const router = inject(Router);
    afterNextRender(() => {
      const page = this.firstPage();
      if (page) void router.navigateByUrl(this.session.path(page.path), { replaceUrl: true });
    });
  }
}
