/**
 * DNS 查询工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory } from '../../types/index';
import { createElement } from '../../utils/dom';
import { dnsTemplate } from './template';

interface DnsRow {
  name: string;
  type: string | number;
  ttl: string | number;
  data: string;
}

interface DnsResult {
  who: string;
  list?: DnsRow[];
  ms?: number;
  raw?: any;
  error?: any;
}

declare function toast(msg: string): void;
declare function copyText(text: string): void;

export class DnsTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'dns',
    title: 'DNS 查询',
    category: ToolCategory.NETWORK,
    icon: '🌐',
    description: '支持 Google/Cloudflare DoH 的 DNS 解析工具',
    keywords: ['dns', '域名', '解析', 'domain', 'doh', 'google', 'cloudflare'],
  };

  config = DnsTool.config;

  private host: HTMLInputElement | null = null;
  private type: HTMLSelectElement | null = null;
  private btn: HTMLButtonElement | null = null;
  private useG: HTMLInputElement | null = null;
  private useC: HTMLInputElement | null = null;
  private trace: HTMLInputElement | null = null;
  private tbl: HTMLInputElement | null = null;
  private useU: HTMLInputElement | null = null;
  private customEp: HTMLInputElement | null = null;
  private gList: HTMLElement | null = null;
  private cList: HTMLElement | null = null;
  private uList: HTMLElement | null = null;
  private gMeta: HTMLElement | null = null;
  private cMeta: HTMLElement | null = null;
  private uMeta: HTMLElement | null = null;
  private gErr: HTMLElement | null = null;
  private cErr: HTMLElement | null = null;
  private uErr: HTMLElement | null = null;
  private uCard: HTMLElement | null = null;

  render(): HTMLElement {
    return createElement('div', {
      className: 'dns-view',
      innerHTML: dnsTemplate,
    });
  }

  protected bindEvents(): void {
    this.host = this.querySelector<HTMLInputElement>('#dnsHost');
    this.type = this.querySelector<HTMLSelectElement>('#dnsType');
    this.btn = this.querySelector<HTMLButtonElement>('#dnsQuery');
    this.useG = this.querySelector<HTMLInputElement>('#dnsUseGoogle');
    this.useC = this.querySelector<HTMLInputElement>('#dnsUseCf');
    this.trace = this.querySelector<HTMLInputElement>('#dnsTrace');
    this.tbl = this.querySelector<HTMLInputElement>('#dnsTbl');
    this.useU = this.querySelector<HTMLInputElement>('#dnsUseCustom');
    this.customEp = this.querySelector<HTMLInputElement>('#dnsCustomEp');
    this.gList = this.querySelector<HTMLElement>('#dnsG');
    this.cList = this.querySelector<HTMLElement>('#dnsC');
    this.uList = this.querySelector<HTMLElement>('#dnsU');
    this.gMeta = this.querySelector<HTMLElement>('#dnsGm');
    this.cMeta = this.querySelector<HTMLElement>('#dnsCm');
    this.uMeta = this.querySelector<HTMLElement>('#dnsUm');
    this.gErr = this.querySelector<HTMLElement>('#dnsGe');
    this.cErr = this.querySelector<HTMLElement>('#dnsCe');
    this.uErr = this.querySelector<HTMLElement>('#dnsUe');
    this.uCard = this.querySelector<HTMLElement>('#dnsCustomCard');

    // 查询按钮
    if (this.btn) {
      this.addEventListener(this.btn, 'click', () => this.run());
    }

    // Enter 键查询
    if (this.host) {
      this.addEventListener(this.host, 'keydown', (e) => {
        if (e.key === 'Enter') this.run();
      });
    }

    // 复制按钮
    const copyBtns = this.querySelectorAll<HTMLElement>('.dns-copy');
    copyBtns.forEach(b => {
      this.addEventListener(b, 'click', () => {
        const t = b.getAttribute('data-target');
        const el = t === 'g' ? this.gList : t === 'c' ? this.cList : this.uList;
        const text = (el?.textContent || '').trim();
        if (text) copyText(text);
      });
    });

    // 自定义端点显隐
    if (this.useU) {
      this.addEventListener(this.useU, 'change', () => {
        if (!this.customEp) return;
        this.customEp.style.display = this.useU?.checked ? 'block' : 'none';
        if (this.uCard) this.uCard.style.display = this.useU?.checked ? 'block' : 'none';
      });
    }

    // 初始化显隐状态
    if (this.uCard) this.uCard.style.display = this.useU?.checked ? 'block' : 'none';
    if (this.customEp) this.customEp.style.display = this.useU?.checked ? 'block' : 'none';
  }

  protected onActivated(): void {
    setTimeout(() => this.host?.focus(), 100);
  }

  private normalizeName(n: string): string {
    n = String(n || '').trim();
    if (!n) return '';
    // 去掉 http(s):// 与尾部斜杠
    n = n.replace(/^https?:\/\//i, '').replace(/[\/?#].*$/, '');
    return n;
  }

  private rrToRow(rr: any): DnsRow | null {
    if (!rr) return null;
    const t = rr.type;
    const name = rr.name || rr.NAME || rr.Name || '';
    const ttl = rr.TTL ?? rr.ttl ?? '';
    let data = '';

    if (t === 1 || t === 'A') data = rr.data || rr.A || rr.ip || '';
    else if (t === 28 || t === 'AAAA') data = rr.data || rr.AAAA || rr.ip || '';
    else if (t === 5 || t === 'CNAME') data = rr.data || rr.cname || '';
    else if (t === 16 || t === 'TXT') {
      const d = rr.data || rr.txt || rr.TXT;
      data = Array.isArray(d) ? d.join(' ') : String(d || '');
    }
    else if (t === 15 || t === 'MX') {
      const p = rr.preference ?? rr.PRIORITY ?? rr.priority ?? '';
      const e = rr.exchange ?? rr.data ?? '';
      data = (p ? (p + " ") : '') + e;
    }
    else if (t === 2 || t === 'NS') data = rr.data || rr.ns || '';
    else if (t === 33 || t === 'SRV') {
      const pr = rr.priority ?? rr.PRIORITY ?? 0;
      const wt = rr.weight ?? 0;
      const port = rr.port ?? 0;
      const trg = rr.target ?? rr.data ?? '';
      data = `${pr} ${wt} ${port} ${trg}`;
    }
    else if (t === 257 || t === 'CAA') {
      const fl = rr.flags ?? 0;
      const tag = rr.tag ?? '';
      const val = rr.value ?? rr.data ?? '';
      data = `${fl} ${tag} "${val}"`;
    }
    else if (t === 12 || t === 'PTR') {
      data = rr.data || rr.ptrdname || rr.PTR || '';
    }
    else data = rr.data || '';

    return { name, type: (typeof t === 'number' ? t : String(t)), ttl, data };
  }

  private renderList(el: HTMLElement | null, list: string[]): void {
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="dns-empty">暂无结果</div>';
      return;
    }
    el.textContent = list.join('\n');
  }

  private renderTable(el: HTMLElement | null, rows: DnsRow[]): void {
    if (!el) return;
    if (!rows || !rows.length) {
      el.innerHTML = '<div class="dns-empty">暂无结果</div>';
      return;
    }
    const thead = '<thead><tr><th>NAME</th><th>TYPE</th><th>TTL</th><th>DATA</th></tr></thead>';
    const tbody = '<tbody>' + rows.map(r =>
      `<tr><td>${r.name || ''}</td><td>${r.type}</td><td>${r.ttl || ''}</td><td>${r.data || ''}</td></tr>`
    ).join('') + '</tbody>';
    el.innerHTML = `<table class="dns-table">${thead}${tbody}</table>`;
  }

  private setMeta(el: HTMLElement | null, ms: number, from: string): void {
    if (el) el.textContent = `耗时 ${ms}ms · 源 ${from}`;
  }

  private setErr(el: HTMLElement | null, e: any): void {
    if (el) el.textContent = e ? String(e) : '';
  }

  private async dohGoogle(name: string, rr: string): Promise<{ list: DnsRow[]; ms: number; raw: any }> {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(rr)}`;
    const t0 = performance.now();
    const res = await fetch(url, { method: 'GET' });
    const t1 = performance.now();
    const data = await res.json();
    const ms = Math.round(t1 - t0);
    const list = (data.Answer || []).map((a: any) => this.rrToRow(a)).filter(Boolean) as DnsRow[];
    return { list, ms, raw: this.trace?.checked ? data : null };
  }

  private async dohCf(name: string, rr: string): Promise<{ list: DnsRow[]; ms: number; raw: any }> {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(rr)}`;
    const t0 = performance.now();
    const res = await fetch(url, { headers: { 'Accept': 'application/dns-json' } });
    const t1 = performance.now();
    const data = await res.json();
    const ms = Math.round(t1 - t0);
    const list = (data.Answer || []).map((a: any) => this.rrToRow(a)).filter(Boolean) as DnsRow[];
    return { list, ms, raw: this.trace?.checked ? data : null };
  }

  private async dohCustom(ep: string, name: string, rr: string): Promise<{ list: DnsRow[]; ms: number; raw: any }> {
    const base = String(ep || '').trim();
    const hasQuery = base.includes('?');
    const url = `${base}${hasQuery ? '&' : '?'}name=${encodeURIComponent(name)}&type=${encodeURIComponent(rr)}`;
    const t0 = performance.now();
    const res = await fetch(url, { headers: { 'Accept': 'application/dns-json' } });
    const t1 = performance.now();
    const data = await res.json();
    const ms = Math.round(t1 - t0);
    const list = (data.Answer || []).map((a: any) => this.rrToRow(a)).filter(Boolean) as DnsRow[];
    return { list, ms, raw: this.trace?.checked ? data : null };
  }

  private toArpa(ipv4: string): string {
    // 1.2.3.4 -> 4.3.2.1.in-addr.arpa
    const m = String(ipv4 || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return '';
    return `${m[4]}.${m[3]}.${m[2]}.${m[1]}.in-addr.arpa`;
  }

  private async run(): Promise<void> {
    let name = this.normalizeName(this.host?.value || '');
    let rr = (this.type?.value || 'A').toUpperCase();

    // IPv4 PTR 自动转换
    if (rr === 'PTR' && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(name)) {
      const arpa = this.toArpa(name);
      if (arpa) name = arpa;
    }

    if (!name) {
      toast('请输入域名');
      return;
    }

    // 清空结果
    [this.gList, this.cList, this.uList].forEach(el => { if (el) el.innerHTML = ''; });
    [this.gMeta, this.cMeta, this.uMeta].forEach(el => { if (el) el.textContent = ''; });
    [this.gErr, this.cErr, this.uErr].forEach(el => { if (el) el.textContent = ''; });

    const tasks: Promise<DnsResult>[] = [];

    if (this.useG?.checked) {
      tasks.push(
        this.dohGoogle(name, rr)
          .then(r => ({ who: 'Google', ...r }))
          .catch(e => ({ who: 'Google', error: e }))
      );
    }

    if (this.useC?.checked) {
      tasks.push(
        this.dohCf(name, rr)
          .then(r => ({ who: 'Cloudflare', ...r }))
          .catch(e => ({ who: 'Cloudflare', error: e }))
      );
    }

    if (this.useU?.checked) {
      const ep = this.customEp?.value || '';
      if (!ep.trim()) {
        toast('请填写自定义 DoH 端点');
      } else {
        tasks.push(
          this.dohCustom(ep, name, rr)
            .then(r => ({ who: 'Custom', ...r }))
            .catch(e => ({ who: 'Custom', error: e }))
        );
      }
    }

    if (!tasks.length) {
      toast('请至少选择一个解析源');
      return;
    }

    const results = await Promise.all(tasks);

    for (const r of results) {
      if (r.who === 'Google') {
        if (r.error) {
          this.setErr(this.gErr, r.error);
          continue;
        }
        if (this.tbl?.checked) {
          this.renderTable(this.gList, r.list || []);
        } else {
          this.renderList(this.gList, (r.list || []).map(x => x.data).filter(Boolean));
        }
        this.setMeta(this.gMeta, r.ms || 0, 'Google');
        if (this.trace?.checked && r.raw && this.gMeta) {
          this.gMeta.textContent += ` · 状态 ${r.raw.Status}`;
        }
      } else if (r.who === 'Cloudflare') {
        if (r.error) {
          this.setErr(this.cErr, r.error);
          continue;
        }
        if (this.tbl?.checked) {
          this.renderTable(this.cList, r.list || []);
        } else {
          this.renderList(this.cList, (r.list || []).map(x => x.data).filter(Boolean));
        }
        this.setMeta(this.cMeta, r.ms || 0, 'Cloudflare');
        if (this.trace?.checked && r.raw && this.cMeta) {
          this.cMeta.textContent += ` · 状态 ${r.raw.Status}`;
        }
      } else if (r.who === 'Custom') {
        if (r.error) {
          this.setErr(this.uErr, r.error);
          continue;
        }
        if (this.tbl?.checked) {
          this.renderTable(this.uList, r.list || []);
        } else {
          this.renderList(this.uList, (r.list || []).map(x => x.data).filter(Boolean));
        }
        this.setMeta(this.uMeta, r.ms || 0, 'Custom');
        if (this.trace?.checked && r.raw && this.uMeta) {
          this.uMeta.textContent += ` · 状态 ${r.raw.Status}`;
        }
      }
    }
  }
}
