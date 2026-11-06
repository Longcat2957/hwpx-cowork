import type { RhwpEditor } from '@rhwp/editor';

export interface RhwpBridge {
    open(file: File): Promise<number>;
    exportFile(format: 'hwp' | 'hwpx'): Promise<Blob>;
    destroy(): void;
}

/** SDK loading is safe for SSR; the runtime is imported only after a browser action. */
export async function inspectRhwpRuntime(): Promise<void> {
    if (typeof window === 'undefined') {
        throw new Error('편집기는 브라우저에서만 연결할 수 있습니다.');
    }
    const sdk = await import('@rhwp/editor');
    if (typeof sdk.createEditor !== 'function') {
        throw new Error('문서 편집기 모듈을 불러오지 못했습니다.');
    }
}

/** The application must explicitly supply its own Studio; SDK's public default is not used. */
export async function connectRhwpEditor(
    container: HTMLElement,
    studioUrl: string,
    onChanged: () => void
): Promise<RhwpBridge> {
    await inspectRhwpRuntime();
    const endpoint = new URL(studioUrl, window.location.origin);
    if (
        !['http:', 'https:'].includes(endpoint.protocol) ||
        endpoint.origin !== window.location.origin
    ) {
        throw new Error('서비스와 같은 출처에 배포된 문서 편집기가 필요합니다.');
    }
    const { createEditor } = await import('@rhwp/editor');
    let editor: RhwpEditor | undefined;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        editor = await Promise.race([
            createEditor(container, {
                studioUrl: endpoint.href,
                requestTimeoutMs: 10000,
                handshakeTimeoutMs: 1000
            }).then((instance) => {
                if (timedOut) {
                    instance.destroy();
                    throw new Error('문서 편집기 연결 시간이 초과되었습니다.');
                }
                return instance;
            }),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => {
                    timedOut = true;
                    container.replaceChildren();
                    reject(
                        new Error('문서 편집기 연결 시간이 초과되었습니다. 다시 시도해 주세요.')
                    );
                }, 20000);
            })
        ]);
    } finally {
        clearTimeout(timeout);
    }
    const instance = editor;
    const off = instance.onDocumentChanged(onChanged);
    return {
        async open(file) {
            if (!/\.(hwp|hwpx)$/i.test(file.name)) {
                throw new Error('HWP 또는 HWPX 파일을 선택해 주세요.');
            }
            const result = await instance.loadFile(await file.arrayBuffer(), file.name);
            return result.pageCount;
        },
        async exportFile(format) {
            const bytes =
                format === 'hwp' ? await instance.exportHwp() : await instance.exportHwpx();
            if (!bytes.byteLength) {
                throw new Error('내보낸 문서가 비어 있습니다. 다시 시도해 주세요.');
            }
            return new Blob([new Uint8Array(bytes)], {
                type: format === 'hwp' ? 'application/x-hwp' : 'application/vnd.hancom.hwpx'
            });
        },
        destroy() {
            off();
            instance.destroy();
        }
    };
}
