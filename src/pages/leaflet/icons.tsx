import { type Component, For, Match, Switch } from 'solid-js'
import type { TopicIcon } from './store'

// Topic 見出しのアイコン。ビジネス資料で使っても違和感のない線画のみ
export const TOPIC_ICONS: { id: TopicIcon; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'circle', label: '〇' },
  { id: 'point', label: 'ポイント' },
  { id: 'check', label: 'チェック' },
  { id: 'info', label: 'インフォ' },
  { id: 'caution', label: '注意' },
  { id: 'hint', label: 'ヒント' },
  { id: 'star', label: 'おすすめ' },
  { id: 'arrow', label: '矢印' },
]

export const TopicIconSvg: Component<{ icon?: TopicIcon; class?: string }> = (props) => (
  <Switch>
    <Match when={props.icon === 'point'}>
      <svg class={`lf-ticon is-point ${props.class ?? ''}`} viewBox="0 0 44 20" aria-hidden="true">
        <rect x="0.75" y="0.75" width="42.5" height="18.5" rx="9.25" />
        <text x="22" y="13.6" text-anchor="middle">POINT</text>
      </svg>
    </Match>
    <Match when={props.icon && props.icon !== 'none'}>
      <svg class={`lf-ticon ${props.class ?? ''}`} viewBox="0 0 20 20" aria-hidden="true">
        <Switch>
          <Match when={props.icon === 'circle'}><circle cx="10" cy="10" r="7" /></Match>
          <Match when={props.icon === 'check'}><circle cx="10" cy="10" r="8" /><path d="M6.2 10.3l2.6 2.6 5-5.4" /></Match>
          <Match when={props.icon === 'info'}><circle cx="10" cy="10" r="8" /><path d="M10 9v5" /><circle class="is-fill" cx="10" cy="6.2" r=".9" /></Match>
          <Match when={props.icon === 'caution'}><path d="M10 2.8l7.6 13.4H2.4z" /><path d="M10 8v4" /><circle class="is-fill" cx="10" cy="14.2" r=".9" /></Match>
          <Match when={props.icon === 'hint'}><path d="M7 13.2c0-1.8-2.4-3-2.4-5.8a5.4 5.4 0 0 1 10.8 0c0 2.8-2.4 4-2.4 5.8z" /><path d="M7.6 15.6h4.8M8.4 17.8h3.2" /></Match>
          <Match when={props.icon === 'star'}><path d="M10 2.6l2.2 4.7 5.1.6-3.8 3.5 1 5.1L10 14l-4.5 2.5 1-5.1-3.8-3.5 5.1-.6z" /></Match>
          <Match when={props.icon === 'arrow'}><circle cx="10" cy="10" r="8" /><path d="M6.5 10h7M10.8 7l3 3-3 3" /></Match>
        </Switch>
      </svg>
    </Match>
  </Switch>
)

export const IconPicker: Component<{ value?: TopicIcon; onChange: (icon: TopicIcon) => void }> = (props) => (
  <div class="lf-icon-picker lf-app-only" role="radiogroup" aria-label="見出しアイコン">
    <For each={TOPIC_ICONS}>
      {(item) => (
        <button
          type="button"
          role="radio"
          aria-checked={(props.value ?? 'none') === item.id}
          classList={{ 'is-active': (props.value ?? 'none') === item.id }}
          title={item.label}
          onClick={() => props.onChange(item.id)}
        >
          {item.id === 'none' ? <span>なし</span> : <TopicIconSvg icon={item.id} />}
        </button>
      )}
    </For>
  </div>
)
