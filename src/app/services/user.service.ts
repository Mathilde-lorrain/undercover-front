import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user';
import { backUrl } from '../../variables';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {}

  register(user: User) {
    return this.http.post(`${backUrl}/users`, user);
  }
}
