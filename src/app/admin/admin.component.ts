import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  user: User;
  constructor(private authenticationService: AuthenticationService) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
  }

  ngOnInit(): void {}
}
