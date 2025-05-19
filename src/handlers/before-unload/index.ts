import { useEffect } from "react";

export function useBeforeUnload(isDirty: () => boolean) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty()) {
                e.preventDefault();
                e.returnValue = ""; // Required for Chrome
                return ""; // Required for Firefox
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);
}