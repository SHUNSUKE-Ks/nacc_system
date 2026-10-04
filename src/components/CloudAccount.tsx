import { type Component, createSignal, onCleanup, Show } from 'solid-js'
import { state } from '../store'
import { signInWithGoogle, signOutGoogle } from '../db/firebase'
import { cloudState } from '../pages/leaflet/store'

// header のログイン・クラウド保存の状態。
// ログインして、そのメールアドレスが Firestore のルールに登録されていれば、
// 成分カードの修正・リーフレットがクラウドに保存され、ほかの端末と共有される。
const CloudAccount: Component = () => {
  const [open, setOpen] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [message, setMessage] = createSignal('')
  let rootRef!: HTMLDivElement

  const onOutside = (event: PointerEvent) => { if (open() && !rootRef.contains(event.target as Node)) setOpen(false) }
  document.addEventListener('pointerdown', onOutside)
  onCleanup(() => document.removeEventListener('pointerdown', onOutside))

  /** ok: クラウドに保存できている / denied: ログインしたが権限がない / local: 端末だけ */
  const status = () => {
    if (state.dbStatus === 'connected') return 'ok'
    if (state.cloudUser && state.dbStatus === 'error') return 'denied'
    if (state.dbStatus === 'connecting') return 'connecting'
    return 'local'
  }
  const label = () => ({ ok: 'クラウド保存中', denied: '権限がありません', connecting: '接続中…', local: 'この端末に保存' }[status()])

  async function login() {
    setBusy(true)
    setMessage('')
    try {
      await signInWithGoogle()
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setMessage(
        code === 'auth/unauthorized-domain' ? 'このURLはまだログインが許可されていません（管理者の設定が必要です）'
          : code === 'auth/operation-not-allowed' ? 'Googleログインがまだ有効になっていません（管理者の設定が必要です）'
            : code === 'auth/popup-closed-by-user' ? 'ログインを取り消しました'
              : `ログインできませんでした（${code || '不明なエラー'}）`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="cloud-account" ref={rootRef}>
      <button type="button" class={`cloud-account-trigger is-${status()}`} onClick={() => setOpen(!open())} aria-expanded={open()} title={label()}>
        <span class="cloud-dot" aria-hidden="true" />
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z" /></svg>
        <span class="hidden sm:inline">{state.cloudUser ? label() : 'ログイン'}</span>
      </button>
      <Show when={open()}>
        <section class="cloud-account-panel" role="dialog" aria-label="クラウド保存">
          <strong>クラウド保存</strong>
          <Show when={state.cloudUser} fallback={
            <>
              <p>今は<b>この端末だけ</b>に保存しています。Googleでログインすると、成分カードの修正やリーフレットがクラウドに保存され、ほかの端末と共有できます。</p>
              <button type="button" class="cloud-login" onClick={login} disabled={busy()}>{busy() ? 'ログイン中…' : 'Googleでログイン'}</button>
            </>
          }>
            {(user) => (
              <>
                <p class="cloud-user">{user().name || user().email}<small>{user().email}</small></p>
                <Show when={status() === 'ok'}>
                  <p class="cloud-ok">クラウドに保存しています。{cloudState() === 'syncing' ? '（同期中…）' : ''}</p>
                </Show>
                <Show when={status() === 'denied'}>
                  <p class="cloud-ng">このメールアドレスには、まだクラウドの読み書きが許可されていません。管理者に、このアドレスの登録を依頼してください。今は端末だけに保存しています。</p>
                </Show>
                <button type="button" class="cloud-logout" onClick={() => void signOutGoogle()}>ログアウト</button>
              </>
            )}
          </Show>
          <Show when={message()}><p class="cloud-ng">{message()}</p></Show>
        </section>
      </Show>
    </div>
  )
}

export default CloudAccount
