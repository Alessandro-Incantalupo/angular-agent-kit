import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  inject,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';

export interface Member {
  id: number;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  active: boolean;
}

/** Team members with a search box. The parent binds [teamId] and [(selectedId)]. */
@Component({
  selector: 'app-member-list',
  imports: [NgFor, NgIf],
  template: `
    <label>
      Search members
      <input #search type="search" (input)="onSearch(search.value)" />
    </label>

    <p *ngIf="loading">Loading members…</p>
    <p *ngIf="error" role="alert">{{ error }}</p>

    <ul *ngIf="!loading && !error">
      <li
        *ngFor="let member of visibleMembers"
        [class.selected]="member.id === selectedId"
        (click)="select(member)"
      >
        {{ member.name }} <small>{{ member.role }}</small>
      </li>
    </ul>

    <p>{{ visibleMembers.length }} of {{ members.length }} shown</p>
  `,
})
export class MemberListComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() teamId!: number;
  @Input() showInactive = false;
  @Input() selectedId: number | null = null;
  @Output() selectedIdChange = new EventEmitter<number>();

  @ViewChild('search') searchInput!: ElementRef<HTMLInputElement>;

  members: Member[] = [];
  visibleMembers: Member[] = [];
  loading = false;
  error = '';

  private query = '';
  private readonly search$ = new Subject<string>();
  private readonly http = inject(HttpClient);

  ngOnInit(): void {
    this.search$.pipe(debounceTime(200)).subscribe((query) => {
      this.query = query;
      this.applyFilter();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teamId']) {
      this.load();
    }
    if (changes['showInactive']) {
      this.applyFilter();
    }
  }

  ngAfterViewInit(): void {
    this.searchInput.nativeElement.focus();
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  select(member: Member): void {
    this.selectedId = member.id;
    this.selectedIdChange.emit(member.id);
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<Member[]>(`/api/teams/${this.teamId}/members`).subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
        this.applyFilter();
      },
      error: () => {
        this.error = 'Could not load the members.';
        this.loading = false;
      },
    });
  }

  private applyFilter(): void {
    const query = this.query.trim().toLowerCase();
    this.visibleMembers = this.members.filter(
      (member) => (this.showInactive || member.active) && member.name.toLowerCase().includes(query),
    );
  }
}
