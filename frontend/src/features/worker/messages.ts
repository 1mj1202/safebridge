// 근로자 화면 고정 안내 문구 (서버 문장 은행에 없는 화면 전용 문장)
// ne/mn/lo/tet/my 는 팀 작성, 원어민 검수 전
export const SENT: Record<string, string> = {
  ko: "관리자에게 전달했어요", en: "Sent to the site manager", zh: "已发送给管理人员",
  vi: "Đã gửi cho quản lý", th: "ส่งถึงผู้จัดการแล้ว",
  ne: "व्यवस्थापकलाई पठाइयो", mn: "Менежерт илгээлээ", lo: "ສົ່ງໃຫ້ຜູ້ຈັດການແລ້ວ",
  tet: "Haruka ona ba jerente", my: "မန်နေဂျာထံ ပို့ပြီးပါပြီ",
};
export const NO_PII: Record<string, string> = {
  ko: "이름·전화번호 같은 개인정보는 쓰지 마세요", en: "Do not write personal info (name, phone)",
  zh: "请勿填写姓名、电话等个人信息", vi: "Không ghi thông tin cá nhân (tên, số điện thoại)",
  th: "ห้ามเขียนข้อมูลส่วนตัว (ชื่อ เบอร์โทร)",
  ne: "नाम, फोन नम्बर जस्ता व्यक्तिगत विवरण नलेख्नुहोस्", mn: "Нэр, утасны дугаар зэрэг хувийн мэдээлэл бүү бич",
  lo: "ຢ່າຂຽນຂໍ້ມູນສ່ວນຕົວ (ຊື່, ເບີໂທ)", tet: "Labele hakerek dadus pesoál (naran, telefone)",
  my: "အမည်၊ ဖုန်းနံပါတ်ကဲ့သို့ ကိုယ်ရေးအချက်အလက် မရေးပါနှင့်",
};
export const THANKS: Record<string, string> = {
  ko: "확인 고마워요. 안전하게 일하세요!", en: "Thank you. Work safely!", zh: "谢谢确认, 注意安全!",
  vi: "Cảm ơn. Hãy làm việc an toàn!", th: "ขอบคุณ ทำงานอย่างปลอดภัย!",
  ne: "धन्यवाद। सुरक्षित रूपमा काम गर्नुहोस्!", mn: "Баярлалаа. Аюулгүй ажиллаарай!",
  lo: "ຂອບໃຈ. ເຮັດວຽກຢ່າງປອດໄພ!", tet: "Obrigadu. Serbisu ho seguru!", my: "ကျေးဇူးတင်ပါသည်။ ဘေးကင်းစွာ အလုပ်လုပ်ပါ!",
};
