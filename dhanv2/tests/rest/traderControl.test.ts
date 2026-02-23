import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { TraderControlApi } from '../../src/rest/traderControl.js';
import { KillSwitchAction, IpFlag } from '../../src/types/index.js';

function mockHttp(): AxiosInstance {
    return {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
    } as unknown as AxiosInstance;
}

describe('TraderControlApi', () => {
    let http: AxiosInstance;
    let api: TraderControlApi;

    beforeEach(() => {
        http = mockHttp();
        api = new TraderControlApi(http, 'CLIENT_1');
    });

    it('getKillSwitchStatus() GETs /killswitch', async () => {
        await api.getKillSwitchStatus();
        expect(http.get).toHaveBeenCalledWith('/killswitch');
    });

    it('activateKillSwitch(ACTIVATE) POSTs to /killswitch with status param', async () => {
        await api.activateKillSwitch(KillSwitchAction.ACTIVATE);
        expect(http.post).toHaveBeenCalledWith(
            expect.stringContaining('/killswitch'),
            expect.anything()
        );
    });

    it('activateKillSwitch(DEACTIVATE) POSTs to /killswitch', async () => {
        await api.activateKillSwitch(KillSwitchAction.DEACTIVATE);
        expect(http.post).toHaveBeenCalled();
    });

    it('getPnlExit() GETs /pnlExit', async () => {
        await api.getPnlExit();
        expect(http.get).toHaveBeenCalledWith('/pnlExit');
    });

    it('configurePnlExit() PUTs to /pnlExit', async () => {
        await api.configurePnlExit({ profitValue: 5000, lossValue: 2000, enableKillSwitch: false });
        expect(http.put).toHaveBeenCalledWith('/pnlExit', expect.objectContaining({
            profitValue: 5000,
            lossValue: 2000,
        }));
    });

    it('disablePnlExit() DELETEs /pnlExit', async () => {
        await api.disablePnlExit();
        expect(http.delete).toHaveBeenCalledWith('/pnlExit');
    });

    it('getStaticIp() GETs /ip/getIP', async () => {
        await api.getStaticIp();
        expect(http.get).toHaveBeenCalledWith('/ip/getIP');
    });

    it('setStaticIp() POSTs to /ip/setIP', async () => {
        await api.setStaticIp({ ip: '1.2.3.4', ipFlag: IpFlag.PRIMARY });
        expect(http.post).toHaveBeenCalledWith('/ip/setIP', expect.objectContaining({
            ip: '1.2.3.4',
        }));
    });

    it('modifyStaticIp() PUTs to /ip/modifyIP', async () => {
        await api.modifyStaticIp({ ip: '5.6.7.8', ipFlag: IpFlag.PRIMARY });
        expect(http.put).toHaveBeenCalledWith('/ip/modifyIP', expect.objectContaining({
            ip: '5.6.7.8',
        }));
    });
});
