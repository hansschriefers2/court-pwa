int _int(dynamic v) => (v as num).toInt();

class Court {
  const Court({
    required this.id,
    required this.name,
    required this.slug,
    required this.minPeople,
    this.description,
    this.mapsUrl,
  });

  final String id;
  final String name;
  final String slug;
  final int minPeople;
  final String? description;
  final String? mapsUrl;

  static const columns = 'id, name, slug, min_people, description, maps_url';

  factory Court.fromRow(Map<String, dynamic> row) => Court(
        id: row['id'] as String,
        name: row['name'] as String,
        slug: row['slug'] as String,
        minPeople: row['min_people'] == null ? 4 : _int(row['min_people']),
        description: _nonEmpty(row['description']),
        mapsUrl: _nonEmpty(row['maps_url']),
      );

  static String? _nonEmpty(dynamic v) {
    if (v is! String) return null;
    final t = v.trim();
    return t.isEmpty ? null : t;
  }
}

enum SlotStatus {
  accepted,
  tentative,
  declined;

  static SlotStatus parse(dynamic value) => switch (value) {
        'tentative' => SlotStatus.tentative,
        'declined' => SlotStatus.declined,
        _ => SlotStatus.accepted,
      };
}

class TimeSlot {
  const TimeSlot({
    required this.id,
    required this.name,
    required this.userId,
    required this.startMin,
    required this.endMin,
    required this.status,
    this.trainingId,
  });

  final String id;
  final String name;

  /// Stable per-device UUID of the creator.
  final String userId;

  /// Minutes from midnight.
  final int startMin;
  final int endMin;
  final SlotStatus status;

  /// Set when this slot is a response to a recurring training.
  final String? trainingId;

  static const columns =
      'id, user_name, user_id, start_min, end_min, date, status, training_id';

  factory TimeSlot.fromRow(Map<String, dynamic> row) => TimeSlot(
        id: row['id'] as String,
        name: (row['user_name'] as String?) ?? '',
        userId: (row['user_id'] as String?) ?? '',
        startMin: _int(row['start_min']),
        endMin: _int(row['end_min']),
        status: SlotStatus.parse(row['status']),
        trainingId: row['training_id'] as String?,
      );
}

class RecurringTraining {
  const RecurringTraining({
    required this.id,
    required this.courtId,
    required this.createdByUserId,
    required this.createdByUsername,
    required this.label,
    required this.dayOfWeek,
    required this.startMin,
    required this.endMin,
  });

  final String id;
  final String courtId;
  final String createdByUserId;
  final String createdByUsername;
  final String label;

  /// JS convention as stored in the DB: 0 = Sunday … 6 = Saturday.
  final int dayOfWeek;
  final int startMin;
  final int endMin;

  static const columns =
      'id, court_id, created_by_user_id, created_by_username, label, day_of_week, start_min, end_min';

  factory RecurringTraining.fromRow(Map<String, dynamic> row) =>
      RecurringTraining(
        id: row['id'] as String,
        courtId: row['court_id'] as String,
        createdByUserId: (row['created_by_user_id'] as String?) ?? '',
        createdByUsername: (row['created_by_username'] as String?) ?? '',
        label: (row['label'] as String?) ?? 'Training',
        dayOfWeek: _int(row['day_of_week']),
        startMin: _int(row['start_min']),
        endMin: _int(row['end_min']),
      );
}

class PinboardMessage {
  const PinboardMessage({
    required this.id,
    required this.courtId,
    required this.userId,
    required this.username,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String courtId;
  final String userId;
  final String username;
  final String message;
  final DateTime createdAt;

  static const columns = 'id, court_id, user_id, username, message, created_at';

  factory PinboardMessage.fromRow(Map<String, dynamic> row) => PinboardMessage(
        id: row['id'] as String,
        courtId: row['court_id'] as String,
        userId: (row['user_id'] as String?) ?? '',
        username: (row['username'] as String?) ?? '',
        message: (row['message'] as String?) ?? '',
        createdAt:
            DateTime.tryParse(row['created_at'] as String? ?? '')?.toLocal() ??
                DateTime.now(),
      );
}

class RecentCourt {
  const RecentCourt({required this.slug, required this.name});

  final String slug;
  final String name;

  factory RecentCourt.fromJson(Map<String, dynamic> json) =>
      RecentCourt(slug: json['slug'] as String, name: json['name'] as String);

  Map<String, dynamic> toJson() => {'slug': slug, 'name': name};
}
