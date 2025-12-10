import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogDetail } from './log-detail';

describe('LogDetail', () => {
  let component: LogDetail;
  let fixture: ComponentFixture<LogDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
