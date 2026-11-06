import { getContext, setContext } from 'svelte';
import type { Gateway } from './gateway.js';

const GATEWAY_CONTEXT = Symbol('document-gateway');

export function setGateway(gateway: Gateway): Gateway {
    return setContext(GATEWAY_CONTEXT, gateway);
}

export function getGateway(): Gateway {
    const gateway = getContext<Gateway | undefined>(GATEWAY_CONTEXT);
    if (!gateway) {
        throw new Error('문서 클라이언트가 준비되지 않았습니다.');
    }
    return gateway;
}
