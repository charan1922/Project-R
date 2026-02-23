/**
 * Trader Control REST API
 * Kill Switch, P&L Exit, and IP Setup.
 */

import { AxiosInstance } from 'axios';
import {
    KillSwitchAction,
    KillSwitchResponse,
    PnlExitRequest,
    SetIpRequest,
    IpResponse,
} from '../types';

export class TraderControlApi {
    constructor(private readonly http: AxiosInstance, private readonly clientId: string) { }

    // ─── Kill Switch ──────────────────────────────────────────────────────────

    /**
     * Get current kill switch status.
     * GET /killswitch
     */
    async getKillSwitchStatus(): Promise<KillSwitchResponse> {
        const resp = await this.http.get<KillSwitchResponse>('/killswitch');
        return resp.data;
    }

    /**
     * Activate or deactivate the kill switch.
     * POST /killswitch?killSwitchStatus=ACTIVATE|DEACTIVATE
     *
     * Activating halts all trading for the remainder of the session.
     * Only possible if no open positions exist.
     */
    async activateKillSwitch(action: KillSwitchAction): Promise<KillSwitchResponse> {
        const resp = await this.http.post<KillSwitchResponse>(
            `/killswitch?killSwitchStatus=${action}`,
            {}
        );
        return resp.data;
    }

    // ─── P&L Exit ─────────────────────────────────────────────────────────────

    /**
     * Get active P&L exit configuration.
     * GET /pnlExit
     */
    async getPnlExit(): Promise<PnlExitRequest> {
        const resp = await this.http.get<PnlExitRequest>('/pnlExit');
        return resp.data;
    }

    /**
     * Configure automatic exit when cumulative P&L thresholds are breached.
     * PUT /pnlExit
     *
     * @warning Setting thresholds below current profit (or above current loss)
     * triggers IMMEDIATE, IRREVERSIBLE liquidation. Use with care.
     * @param req.enableKillSwitch - Lock account after liquidation if true.
     */
    async configurePnlExit(req: PnlExitRequest): Promise<unknown> {
        const resp = await this.http.put<unknown>('/pnlExit', req);
        return resp.data;
    }

    /**
     * Disable the active P&L exit configuration.
     * DELETE /pnlExit
     */
    async disablePnlExit(): Promise<unknown> {
        const resp = await this.http.delete<unknown>('/pnlExit');
        return resp.data;
    }

    // ─── IP Setup ─────────────────────────────────────────────────────────────

    /**
     * Get currently mapped Primary and Secondary IPs.
     * GET /ip/getIP
     */
    async getStaticIp(): Promise<IpResponse> {
        const resp = await this.http.get<IpResponse>('/ip/getIP');
        return resp.data;
    }

    /**
     * Set Primary (and optionally Secondary) whitelisted IP for order placement.
     * POST /ip/setIP
     */
    async setStaticIp(req: Omit<SetIpRequest, 'dhanClientId'>): Promise<IpResponse> {
        const payload: SetIpRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.post<IpResponse>('/ip/setIP', payload);
        return resp.data;
    }

    /**
     * Modify existing static IP mapping.
     * PUT /ip/modifyIP
     * Note: Modifications are frequency-capped.
     */
    async modifyStaticIp(req: Omit<SetIpRequest, 'dhanClientId'>): Promise<IpResponse> {
        const payload: SetIpRequest = { ...req, dhanClientId: this.clientId };
        const resp = await this.http.put<IpResponse>('/ip/modifyIP', payload);
        return resp.data;
    }
}
