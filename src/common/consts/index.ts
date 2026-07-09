export const VILLAGE_CODE_MAP: Record<number, string> = {
  1: 'KLB',
  2: 'CL',
  3: 'PS',
  4: 'HIS',
  5: 'KDD',
  6: 'LLD',
  7: 'WNG',
};

export const WaterUsageStatus = {
  NEW: '0',
  PAID: '1',
  UNDERPAYMENT: '2',
  OVERPAYMENT: '3',
};

export const formatRupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');

export const STATUS_MAP: Record<string, string> = {
  '0': 'Belum Bayar',
  '1': 'Lunas',
  '2': 'Kurang Bayar',
  '3': 'Lebih Bayar',
};
