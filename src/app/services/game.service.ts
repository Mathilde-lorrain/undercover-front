import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { backUrl } from '../../variables';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  constructor(private http: HttpClient) {}

  create() {
    return this.http.post<any>(`${backUrl}/games`, `{}`).subscribe((game) => {
      console.log('My game');
      console.log(game);
      return this.http.post(`${backUrl}/games/${game.id}/users`, '{}');
    });
  }
}
