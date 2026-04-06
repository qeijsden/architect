import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element #root was not found");
}

const renderStartupError = (title: string, detail: string) => {
	rootElement.innerHTML = `
		<div style="min-height:100vh;background:#0a0e14;color:#f8fafc;padding:24px;font-family:monospace;display:flex;align-items:center;justify-content:center;">
			<div style="max-width:960px;width:100%;border:2px solid #ef4444;background:#111827;padding:24px;box-shadow:0 0 30px rgba(239,68,68,.2);">
				<div style="font-size:18px;font-weight:700;color:#fca5a5;margin-bottom:16px;">${title}</div>
				<div style="white-space:pre-wrap;word-break:break-word;line-height:1.5;color:#e5e7eb;">${detail}</div>
			</div>
		</div>
	`;
};

window.addEventListener("error", (event) => {
	const error = event.error as Error | undefined;
	const detail = [
		event.message,
		error?.stack,
		`Source: ${event.filename || "unknown"}:${event.lineno || 0}:${event.colno || 0}`,
	]
		.filter(Boolean)
		.join("\n\n");

	renderStartupError("Architect startup error", detail || "Unknown window error");
});

window.addEventListener("unhandledrejection", (event) => {
	const reason = event.reason;
	const detail = typeof reason === "string"
		? reason
		: reason instanceof Error
			? `${reason.message}\n\n${reason.stack || ""}`
			: JSON.stringify(reason, null, 2);

	renderStartupError("Architect unhandled promise rejection", detail || "Unknown rejection");
});

rootElement.innerHTML = `
	<div style="min-height:100vh;background:#0a0e14;color:#f8fafc;display:flex;align-items:center;justify-content:center;font-family:monospace;">
		Booting Architect...
	</div>
`;

async function bootstrap() {
	try {
		const [{ default: App }] = await Promise.all([import("./App.tsx")]);
		createRoot(rootElement).render(<App />);
	} catch (error) {
		const detail = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
		renderStartupError("Architect failed to bootstrap", detail);
	}
}

void bootstrap();
