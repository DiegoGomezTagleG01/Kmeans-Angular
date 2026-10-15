import { TestBed } from '@angular/core/testing';
import { Kmeans } from './kmeans';

describe('Kmeans', () => {
  let service: Kmeans;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Kmeans);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
