# T-001: Sắp xếp lại thứ tự status trong board

> Đổi thứ tự các cột trong `.kanban/board.md` thành Doing > Todo > Done > Backlog > Blocked

- **priority**: medium
- **effort**: XS
- **completed**: 2026-05-29

## Criteria
- [x] `.kanban/board.md` có các section theo thứ tự: Doing, Todo, Done, Backlog, Blocked
- [x] Toàn bộ board line hiện có (nếu có) được giữ nguyên dưới đúng section của nó
- [x] Timestamp `<!-- Updated: -->` được cập nhật

## Notes
Thứ tự mới ưu tiên việc đang làm (Doing) lên đầu để dễ nhìn khi mở board, đẩy Backlog/Blocked xuống cuối.
