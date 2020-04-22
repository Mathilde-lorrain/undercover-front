import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { GameService } from '../services/game.service';
import { NotifierService } from 'angular-notifier';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  user: User;
  wordForm: FormGroup;
  constructor(
    private authenticationService: AuthenticationService,
    private formBuilder: FormBuilder,
    private gameService: GameService,
    private notifier: NotifierService
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
  }

  ngOnInit(): void {
    this.wordForm = this.formBuilder.group({
      firstWord: ['', Validators.required],
      secondWord: ['', Validators.required],
    });
  }
  // convenience getter for easy access to form fields
  get f() {
    return this.wordForm.controls;
  }

  onSubmit() {
    // stop here if form is invalid
    if (this.wordForm.invalid) {
      return;
    }
    this.gameService
      .addWords(
        this.wordForm.controls.firstWord.value,
        this.wordForm.controls.secondWord.value
      )
      .subscribe((message) => {
        // Words added
        this.notifier.notify('info', `Words have been added.`);
      });
  }
}
