import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { backUrl } from '../../variables';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  constructor(private http: HttpClient) {}
  public currentGame: Observable<any>;
  public game;

  setGame(game) {
    this.game = game;
  }
  getGame() {
    return this.game;
  }
  create() {
    return this.http.post<any>(`${backUrl}/api/games`, {});
  }
}
