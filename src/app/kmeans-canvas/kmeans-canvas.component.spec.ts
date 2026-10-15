import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KmeansCanvasComponent } from './kmeans-canvas.component';

describe('KmeansCanvasComponent', () => {
  let component: KmeansCanvasComponent;
  let fixture: ComponentFixture<KmeansCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KmeansCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KmeansCanvasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
