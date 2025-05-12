// In DbStressService.service.ts
import { Injectable } from "@angular/core";
import  { HttpClient } from "@angular/common/http";
import type { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class DbStressService {
  stopStressTest() {
    throw new Error('Method not implemented.');
  }
  startStressTest() {
    throw new Error('Method not implemented.');
  }
}