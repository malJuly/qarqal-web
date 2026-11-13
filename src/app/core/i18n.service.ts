import { Injectable, computed, signal } from '@angular/core';
import site from '../config/site.json';
import { getDict, type Lang } from '../i18n';

/**
 * The current page's language and dictionary. Each page component sets the language from its route
 * (see app.routes.ts) before its children render, so every component reads the right text.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>('en');
  readonly t = computed(() => getDict(this.lang()));
  /** This language's entry in site.json (label and root path such as "/ms/"). */
  readonly current = computed(() => site.languages.find((l) => l.code === this.lang()) ?? site.languages[0]);
  /** Root path of this language, e.g. "/" or "/ms/". */
  readonly home = computed(() => this.current().path);
}
