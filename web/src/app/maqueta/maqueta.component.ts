import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-maqueta',
  imports: [RouterLink],
  templateUrl: './maqueta.component.html',
  styleUrl: './maqueta.component.css',
})
export class MaquetaComponent {
  // Ruta relativa al base-href, para que funcione en /vespino/ de GitHub Pages.
  protected readonly url: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(
    'sim/index.html',
  );
}
