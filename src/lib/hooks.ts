"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type BillingStatus } from "./api";

// ── Generic tool hook ────────────────────────────────────────

export function useToolQuery<T = unknown>(
  toolName: string,
  params: Record<string, unknown> = {},
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<T>({
    queryKey: ["tool", toolName, params],
    queryFn: () => api.call<T>(toolName, params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    retry: 1,
    staleTime: 10000,
  });
}

// ═══════════════════════════════════════════════════════════
//  CRYPTO — CoinGecko (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useCryptoPrice(coinId: string) {
  return useToolQuery("get_crypto_price", { coin_id: coinId }, { refetchInterval: 30000 });
}

export function useCryptoBatch(coinIds: string[]) {
  return useToolQuery("get_crypto_batch_prices", { coin_ids: coinIds }, { refetchInterval: 30000 });
}

export function useCryptoTopN(n = 20) {
  return useToolQuery("get_crypto_top_n", { n }, { refetchInterval: 30000 });
}

export function useCryptoSearch(query: string) {
  return useToolQuery("search_crypto", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useStockPrice(ticker: string) {
  return useToolQuery("get_stock_price", { ticker }, { enabled: !!ticker, refetchInterval: 60000 });
}

// ═══════════════════════════════════════════════════════════
//  FRED — Macro Economics (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useMacroData() {
  return useToolQuery("get_economic_dashboard", {}, { refetchInterval: 300000 });
}

export function useFredSeries(seriesId: string) {
  return useToolQuery("get_fred_series", { series_id: seriesId }, { enabled: !!seriesId, refetchInterval: 300000 });
}

export function useSearchFred(query: string) {
  return useToolQuery("search_fred", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  INTELLIGENCE — Y2 News & Sentiment (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useNewsSentiment() {
  return useToolQuery("get_news_sentiment", {}, { refetchInterval: 120000 });
}

export function useNewsRecap() {
  return useToolQuery("get_news_recap", {}, { refetchInterval: 120000 });
}

export function useIntelReports() {
  return useToolQuery("get_intelligence_reports", {}, { refetchInterval: 300000 });
}

export function useReportDetail(reportId: string) {
  return useToolQuery("get_report_detail", { report_id: reportId }, { enabled: !!reportId, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  ELFA — Social Sentiment (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useTrendingTokens() {
  return useToolQuery("get_trending_tokens", {}, { refetchInterval: 60000 });
}

export function useTopMentions() {
  return useToolQuery("get_top_mentions", {}, { refetchInterval: 60000 });
}

export function useSearchMentions(query: string) {
  return useToolQuery("search_mentions", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useTrendingNarratives() {
  return useToolQuery("get_trending_narratives", {}, { refetchInterval: 120000 });
}

export function useTokenNews(token: string) {
  return useToolQuery("get_token_news", { token }, { enabled: !!token, refetchInterval: 60000 });
}

// ═══════════════════════════════════════════════════════════
//  SOCIAL — X/Twitter
// ═══════════════════════════════════════════════════════════

export function useXSearch(query: string) {
  return useToolQuery("search_x", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  HYPERLIQUID — Perp Trading (Pro)
// ═══════════════════════════════════════════════════════════

export function useHLConfig() {
  return useToolQuery("get_hl_config", {}, { refetchInterval: 300000 });
}

export function useHLAccount() {
  return useToolQuery("get_hl_account_info", {}, { refetchInterval: 15000 });
}

export function useHLPositions() {
  return useToolQuery("get_hl_positions", {}, { refetchInterval: 10000 });
}

export function useHLOrderbook(coin: string) {
  return useToolQuery("get_hl_orderbook", { coin }, { enabled: !!coin, refetchInterval: 5000 });
}

export function useOpenOrders() {
  return useToolQuery("get_hl_open_orders", {}, { refetchInterval: 5000 });
}

export function usePlaceHLOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { coin: string; side: string; size: number; price?: number; orderType?: string }) =>
      api.placeHLOrder(params.coin, params.side, params.size, params.price, params.orderType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_positions"] });
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_open_orders"] });
    },
  });
}

export function useCancelHLOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { coin: string; orderId: string }) =>
      api.cancelHLOrder(params.coin, params.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_open_orders"] });
    },
  });
}

export function useCloseHLPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (coin: string) => api.closeHLPosition(coin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_positions"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════
//  ASTER DEX — Futures Trading (Pro)
// ═══════════════════════════════════════════════════════════

export function useAsterDiagnose() {
  return useToolQuery("aster_diagnose", {}, { refetchInterval: 0 });
}

export function useAsterPing() {
  return useToolQuery("aster_ping", {}, { refetchInterval: 60000 });
}

export function useAsterTicker(symbol: string) {
  return useToolQuery("aster_ticker", { symbol }, { enabled: !!symbol, refetchInterval: 10000 });
}

export function useAsterOrderbook(symbol: string) {
  return useToolQuery("aster_orderbook", { symbol }, { enabled: !!symbol, refetchInterval: 5000 });
}

export function useAsterKlines(symbol: string, interval = "5m", limit = 200) {
  return useToolQuery("aster_klines", { symbol, interval, limit }, { enabled: !!symbol, refetchInterval: 30000 });
}

export function useAsterFundingRate(symbol: string) {
  return useToolQuery("aster_funding_rate", { symbol }, { enabled: !!symbol, refetchInterval: 30000 });
}

export function useAsterExchangeInfo() {
  return useToolQuery("aster_exchange_info", {}, { refetchInterval: 300000 });
}

export function useAsterBalance() {
  return useToolQuery("aster_balance", {}, { refetchInterval: 15000 });
}

export function useAsterPositions() {
  return useToolQuery("aster_positions", {}, { refetchInterval: 10000 });
}

export function useAsterAccountInfo() {
  return useToolQuery("aster_account_info", {}, { refetchInterval: 30000 });
}

export function useAsterOpenOrders() {
  return useToolQuery("aster_open_orders", {}, { refetchInterval: 5000 });
}

export function usePlaceAsterOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { symbol: string; side: string; quantity: number; price?: number; orderType?: string }) =>
      api.asterPlaceOrder(params.symbol, params.side, params.quantity, params.price, params.orderType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_positions"] });
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useCancelAsterOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { symbol: string; orderId: string }) =>
      api.asterCancelOrder(params.symbol, params.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useCancelAllAster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol?: string) => api.asterCancelAll(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useAsterSetLeverage() {
  return useMutation({
    mutationFn: (params: { symbol: string; leverage: number }) =>
      api.asterSetLeverage(params.symbol, params.leverage),
  });
}

// ═══════════════════════════════════════════════════════════
//  BILLING & ACCOUNT — Stripe
// ═══════════════════════════════════════════════════════════

export function useBillingStatus() {
  return useQuery<BillingStatus>({
    queryKey: ["billing", "status"],
    queryFn: () => api.getBillingStatus(),
    staleTime: 60000,
  });
}

export function usePortalSession() {
  return useMutation({
    mutationFn: () => api.getPortalSession(),
  });
}

export function useBillingUsage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<Record<string, any>>({
    queryKey: ["billing", "usage"],
    queryFn: () => api.getBillingUsage() as any,
    staleTime: 60000,
  });
}

export function useBillingHistory() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<any[]>({
    queryKey: ["billing", "history"],
    queryFn: () => api.getBillingHistory() as any,
    staleTime: 60000,
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: string = "") => api.subscribe(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useCreateApiKey() {
  return useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
  });
}

// ═══════════════════════════════════════════════════════════
//  SYSTEM — Health, Tools, Metrics
// ═══════════════════════════════════════════════════════════

export function useApiHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useToolsList() {
  return useQuery({
    queryKey: ["tools", "list"],
    queryFn: () => api.listTools(),
    staleTime: 300000,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => api.getMetrics(),
    staleTime: 60000,
  });
}

// ═══════════════════════════════════════════════════════════
//  DEX — DexScreener helpers (mapped to search_crypto)
// ═══════════════════════════════════════════════════════════

export function useDexTrending() {
  return useToolQuery("get_trending_tokens", {}, { refetchInterval: 60000 });
}

export function useDexSearch(query: string) {
  return useToolQuery("search_crypto", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  TRADE HISTORY
// ═══════════════════════════════════════════════════════════

export function useTradeHistory() {
  return useToolQuery("get_hl_trade_history", {}, { refetchInterval: 15000 });
}

export function useAsterTradeHistory() {
  return useToolQuery("aster_trade_history", {}, { refetchInterval: 15000 });
}
