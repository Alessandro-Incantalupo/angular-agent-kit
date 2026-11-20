import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

export interface Member {
  id: number;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  active: boolean;
}

/** Team members with a search box. The parent binds [teamId] and [(selectedId)]. */
@Component({
  selector: 'app-member-list',
  template: `
    <label>
      Search members
      <input #search type="search" (input)="onSearch(search.value)" />
    </label>

    @if (members.isLoading()) {
      <p>Loading members…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }

    @if (!members.isLoading() && !error()) {
      <ul>
        @for (member of visibleMembers(); track member.id) {
          <li [class.selected]="member.id === selectedId()" (click)="select(member)">
            {{ member.name }} <small>{{ member.role }}</small>
          </li>
        }
      </ul>
    }

    <p>{{ visibleMembers().length }} of {{ members.value().length }} shown</p>
  `,
})
export class MemberListComponent {
  readonly teamId = input.required<number>();
  readonly showInactive = input(false);
  readonly selectedId = model<number | null>(null);

  readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');

  protected readonly members = httpResource<Member[]>(() => `/api/teams/${this.teamId()}/members`, {
    defaultValue: [],
  });
  protected readonly error = computed(() =>
    this.members.error() ? 'Could not load the members.' : '',
  );

  private readonly rawQuery = signal('');
  private readonly query = toSignal(toObservable(this.rawQuery).pipe(debounceTime(200)), {
    initialValue: '',
  });

  protected readonly visibleMembers = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.members
      .value()
      .filter(
        (member) =>
          (this.showInactive() || member.active) && member.name.toLowerCase().includes(query),
      );
  });

  constructor() {
    afterNextRender(() => this.searchInput().nativeElement.focus());
  }

  onSearch(value: string): void {
    this.rawQuery.set(value);
  }

  select(member: Member): void {
    this.selectedId.set(member.id);
  }
}
