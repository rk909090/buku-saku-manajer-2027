/** Kesalahan yang aman ditampilkan ke pembeli/admin (pesan + status HTTP). */
export class ShopError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Kupon tidak bisa dipakai (tidak valid, berakhir, kuota habis, dll.). */
export class CouponError extends ShopError {
  constructor(message: string) {
    super(message, 422);
  }
}
