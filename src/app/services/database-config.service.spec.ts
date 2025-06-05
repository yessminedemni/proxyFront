import { TestBed } from '@angular/core/testing';

import { DatabaseConfigService } from './database-config.service';

describe('DatabaseConfigService', () => {
  let service: DatabaseConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatabaseConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});