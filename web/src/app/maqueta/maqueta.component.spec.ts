import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MaquetaComponent } from './maqueta.component';

describe('MaquetaComponent', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [MaquetaComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(MaquetaComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('incrusta la maqueta con ruta relativa al base-href', async () => {
    const el = await crear();
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const src = iframe!.getAttribute('src')!;
    expect(src.endsWith('sim/index.html')).toBe(true);
    expect(src.startsWith('/')).toBe(false);
  });

  it('tiene botón Volver a la portada', async () => {
    const el = await crear();
    const enlace = el.querySelector('a[href="/"]');
    expect(enlace?.textContent).toContain('Volver');
  });
});
