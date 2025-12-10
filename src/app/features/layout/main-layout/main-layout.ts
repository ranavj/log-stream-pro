import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../../shared/ui/sidebar/sidebar';
import { Header } from '../../../shared/ui/header/header';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {

}
