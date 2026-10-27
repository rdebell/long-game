import { useNavigate } from 'react-router-dom';
import { IconButton, Screen } from '../components/ui';
import {
  DEFAULT_HEALTH_SHORTCUT_NAME,
  HEALTH_EXAMPLE_END,
  HEALTH_EXAMPLE_START,
  healthHandoff,
} from '../health';

const EXAMPLE = healthHandoff(HEALTH_EXAMPLE_START, HEALTH_EXAMPLE_END, DEFAULT_HEALTH_SHORTCUT_NAME);

export function HealthHelp() {
  const navigate = useNavigate();
  return (
    <Screen>
      <header className="topbar">
        <IconButton label="Back to settings" name="back" onClick={() => navigate('/settings')} />
        <h1>Log to Health</h1>
        <span aria-hidden="true" />
      </header>
      <p className="lead">
        A web app cannot write Apple Health. The button on the workout result screen opens a shortcut that can. Build
        that shortcut once. The name in Shortcuts has to match Settings. The default is {DEFAULT_HEALTH_SHORTCUT_NAME}.
      </p>
      <h2 className="section-title">What the button sends</h2>
      <div className="note-block">
        <p>
          When the workout ends, Long Game copies the length in minutes to the clipboard. For a 12 minute session that
          text is <code className="sample">{EXAMPLE.clipboard}</code>. The button then opens this URL. The shortcut
          input is the JSON. The clipboard is only the number, for when you run the shortcut yourself.
        </p>
        <code className="sample">{EXAMPLE.url}</code>
        <p>
          The JSON has two keys. <code>minutes</code> is the length, rounded to the nearest minute, and at least 1.{' '}
          <code>start</code> is when the workout screen opened, in UTC.
        </p>
        <code className="sample">{EXAMPLE.text}</code>
      </div>
      <h2 className="section-title">Build the shortcut</h2>
      <ol className="steps">
        <li>
          Open the Shortcuts app, tap +, and name the shortcut <strong>{DEFAULT_HEALTH_SHORTCUT_NAME}</strong>. If you
          pick another name, put that exact name in Settings.
        </li>
        <li>
          The shortcut starts with <strong>Receive Text input from Share Sheet</strong>. Leave the input type as Text.
          The button sends text through the shortcut URL.
        </li>
        <li>
          Add <strong>If</strong>. Set the condition to <strong>Shortcut Input</strong> <strong>has any value</strong>.
          Shortcut Input is the text the button passes. It is what Get Shortcut Input returns.
        </li>
        <li>
          Inside If, add <strong>Set Variable</strong>. Name it <code>Payload</code>. Set it to{' '}
          <strong>Shortcut Input</strong>.
        </li>
        <li>
          Inside Otherwise, add <strong>Get Clipboard</strong>, then <strong>Set Variable</strong> <code>Payload</code>{' '}
          to the <strong>Clipboard</strong>.
        </li>
        <li>
          Under End If, add a second <strong>If</strong>. Set it to <code>Payload</code> <strong>begins with</strong>{' '}
          <code>{'{'}</code>. The button’s JSON starts with a brace. The clipboard is only digits, so it does not.
        </li>
        <li>
          Inside that If:
          <ul>
            <li>
              <strong>Get Dictionary from Input</strong>, and choose <code>Payload</code>.
            </li>
            <li>
              <strong>Get Dictionary Value</strong> for key <code>minutes</code>. <strong>Set Variable</strong>{' '}
              <code>Minutes</code> to that value.
            </li>
            <li>
              <strong>Get Dictionary Value</strong> for key <code>start</code>.
            </li>
            <li>
              <strong>Get Dates from Input</strong> on that start text. If you get a list, add{' '}
              <strong>Get Item from List</strong> and take the first item.
            </li>
            <li>
              <strong>Set Variable</strong> <code>Start</code> to that date. The text looks like{' '}
              <code>{EXAMPLE.start}</code>. If Get Dates comes back empty, pass the start text itself into the Date
              field in the next step. Shortcuts can read that ISO time.
            </li>
          </ul>
        </li>
        <li>
          Inside Otherwise (the clipboard path):
          <ul>
            <li>
              <strong>Set Variable</strong> <code>Minutes</code> to <code>Payload</code>.
            </li>
            <li>
              Add <strong>Date</strong> and choose <strong>Current Date</strong>.
            </li>
            <li>
              Add <strong>Adjust Date</strong>. Subtract <code>Minutes</code> <strong>minutes</strong> from Current
              Date.
            </li>
            <li>
              <strong>Set Variable</strong> <code>Start</code> to the adjusted date. That estimates the start as now
              minus the length.
            </li>
          </ul>
        </li>
        <li>
          Under End If, search for <strong>Log Workout</strong> and add it. It is in Health.
          <ul>
            <li>
              Type: <strong>Functional Strength Training</strong>
            </li>
            <li>
              Date: <code>Start</code>
            </li>
            <li>
              Duration: <code>Minutes</code>, and set the unit to <strong>minutes</strong>
            </li>
            <li>Leave calories and distance empty.</li>
          </ul>
        </li>
        <li>
          Optional. Add <strong>Open URL</strong> and set it to <code>https://rdebell.github.io/long-game/</code> if
          you want a browser tab afterward. The home-screen app stays in the app switcher. Switch back to Long Game if
          Safari opens instead.
        </li>
      </ol>
      <div className="note-block">
        <p>
          The first time the shortcut runs, iPhone asks permission to write Health data. Allow it. That prompt happens
          once.
        </p>
        <p>
          Reps do not go to Health. The shortcut sends the workout type, the start time, and the duration. Every set
          stays in Long Game.
        </p>
        <p>
          To try the clipboard path before a workout, copy <code>{EXAMPLE.clipboard}</code>, run the shortcut from the
          Shortcuts app, and confirm a functional strength workout of that many minutes. Then finish a workout in Long
          Game and tap Log to Health.
        </p>
      </div>
    </Screen>
  );
}
