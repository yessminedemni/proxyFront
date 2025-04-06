import { Component } from "@angular/core";
import { ScenarioCardComponent } from "../scenario-card/scenario-card.component";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [RouterModule], // 👈 This is what makes routerLink work

  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
title: any;
}
