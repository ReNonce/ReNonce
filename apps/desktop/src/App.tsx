/**
 * @title ReNonce root component
 * @notice Renders the app layout shell (top bar, resizable content, bottom bar).
 * @dev Keep this component thin — feature views belong inside the layout
 * panels under `src/components/layout/`, not here.
 */
import "./App.css";
import { AppLayout } from "./components/layout/app-layout/AppLayout";

function App() {
  return <AppLayout />;
}

export default App;
