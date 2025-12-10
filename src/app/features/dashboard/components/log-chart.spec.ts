import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogChart } from './log-chart';

describe('LogChart', () => {
  let component: LogChart;
  let fixture: ComponentFixture<LogChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
